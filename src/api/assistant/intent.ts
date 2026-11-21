/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Intent parser for the AI chat (moved from the frontend on 2026-11-21 so the
 * prompts live server-side). One model call classifies the latest message and
 * extracts what/where; deterministic regex overrides fix the phrasings models
 * get wrong. Used only by ChatTurnService.
 */

/** (userInput, cachedSystemPrompt) → raw model text. */
export type Completer = (input: string, cachedSystem: string) => Promise<string>;

/**
 * How a turn should be handled:
 *  - `service_request`  — the user wants provider options → UI shows cards.
 *  - `network_inquiry`  — the user is asking ABOUT the supplier network
 *                         ("do you have DJs in Heredia?", "are there
 *                         suppliers near me?") → we search the DB and let
 *                         the AI answer in text, but show NO cards.
 *  - `chat`             — general conversation, or a question about results
 *                         ALREADY shown ("compare the first and last one")
 *                         → no DB search, no cards.
 */
export type QueryIntent = 'service_request' | 'network_inquiry' | 'chat';

/**
 * A single searchable topic pulled out of the user's message. When the
 * user asks for one thing, `ParsedQuery` itself is enough. When they ask
 * for several (e.g. "cleaning on Saturday AND catering on Sunday"), the
 * parser also fills `subrequests` so the chat layer can run one search +
 * one reply per topic instead of blending them into a single search
 * (which surfaces compromise suppliers no one is happy with).
 */
export interface SubRequest {
  service: string;
  people?: string;
  location?: string;
  budget?: string;
  when?: string;
  dietary?: string;
}

export interface ParsedQuery {
  service: string;
  people: string;
  location: string;
  budget: string;
  when: string;
  dietary?: string;
  intent: QueryIntent;
  /**
   * Populated only when the user asked for more than one distinct
   * service in a single message. `undefined` or length ≤ 1 means the
   * top-level `service`/`when`/… fields already cover the intent — the
   * chat runs its normal single-search flow.
   */
  subrequests?: SubRequest[];
}


const PARSE_SYSTEM_PROMPT = `You are an intent parser for Solvo, an app in Costa Rica that connects people with local service providers (plumbers, electricians, cleaners, DJs…) and product/material suppliers (bakeries, hardware and building-material stores, groceries…).
The user will provide a free-text message in a multi-turn conversation. Classify their INTENT and, when applicable, extract structured fields. Respond with ONLY a JSON object — no prose, no markdown fences, no commentary.

Schema:
{
  "intent": "one of 'service_request', 'network_inquiry', or 'chat' — see the intent rules below",
  "service": "what the user needs, in their own language, 1-4 words: 'fontanero', 'pan dulce', 'cemento', 'DJ', 'AC repair'. Use empty string '' when no service or product is implied.",
  "people": "string number of people (e.g. '35 people'), OR an empty string '' if not mentioned. NEVER write the word 'unspecified'.",
  "location": "the place the user named (province, canton, town or neighbourhood, e.g. 'Heredia', 'Santa Ana', 'cerca de Escazú'), copied as written. Empty string '' when the user did not name a place — never guess one.",
  "budget": "string budget formatted as '₡XXX,XXX' if mentioned, OR an empty string '' if not mentioned. NEVER write the word 'unspecified'.",
  "when": "string time/date if mentioned (e.g. 'Saturday', 'next week'), OR an empty string '' if not mentioned",
  "dietary": "OPTIONAL: dietary or special needs as a short phrase, omit the field entirely if none",
  "subrequests": "OPTIONAL array of { service, people?, when?, location?, budget?, dietary? } — emit ONLY for multi-service requests, see 'Multi-service requests' below. Omit the field entirely for single-service messages."
}

Intent rules — apply in this order (first match wins):

1. CHAT — a question about results ALREADY shown, or about a specific named provider, or general conversation. These need NO new search.
   1a. References to already-shown results: "the first result", "the last one", "second option", "compare them", "what's the difference between these", "which is cheaper", "primer resultado", "última opción", "compara los dos". The user is asking about cards already on screen — NOT requesting new ones.
       Examples → chat:
       - "Throw me a comparison between the first result and the last one"
       - "Which of these is cheaper?"
       - "Compare the first two options"
       - "¿Cuál de estos me recomiendas?"
   1b. Questions ABOUT a specific named provider/business — even if a service-category word appears in or near the name ("DJ Carlos Mora", "Studio Luz", "Piki Tiki", "Sabor Catering").
       Signals (EN): "where is", "what does", "how much does", "is X verified", "tell me about", "does X do".
       Signals (ES): "dónde está", "dónde queda", "cuánto cobra", "qué incluye", "qué tal", "háblame de", "y X?".
       Examples → chat:
       - "Where is PikiTiki located?"
       - "Donde esta DJ Carlos Mora ubicado?"
       - "y Piki Tiki?"
       - "¿Cuánto cobra Sabor Catering?"
   1c. General conversation: how Solvo works, what "verified" means in general, greetings, thanks, off-topic chat.

2. NETWORK_INQUIRY — the user is asking ABOUT the supplier network/inventory in general (not naming a specific business, not picking one): whether suppliers exist, what's available, coverage. We will search the DB and answer in text — no cards.
   Signals (EN): "do you have", "are there any (suppliers/providers)", "what (suppliers/services/categories) do you have", "is there anyone who", "who's in your network".
   Signals (ES): "tienen", "hay (proveedores/suppliers)", "qué (proveedores/servicios) tienen", "hay alguien que", "tienen suppliers en".
   Examples → network_inquiry:
   - "Are there any suppliers in our network?"
   - "Do you have DJs in Heredia?"
   - "What categories of services do you cover?"
   - "¿Tienen proveedores de catering en San José?"
   - "Is there anyone who does AC repair?"

3. SERVICE_REQUEST — the user wants us to find/recommend providers FOR THEM to pick from, or is refining an earlier search. This is the "show me options I can act on" intent.
   Signals (EN): "I need", "find me", "show me", "recommend me", "plan a", "get me", "any X under ₡…".
   Signals (ES): "necesito", "busco", "muéstrame", "recomiéndame", "quiero", "encuéntrame", "consígueme".

   ⚠️ ADDITIVE FOLLOW-UPS — after prior providers are on screen, messages that add a NEW service ("nice, I also need cleaning", "y también necesito un fotógrafo", "and can you find me a bakery too") are ALWAYS service_request — not chat. The user is asking for a NEW search on the new topic. The parsed "service" field should be the NEWLY-mentioned service (e.g. "Cleaning"), NOT the previously-discussed one. Do NOT re-include prior topics in the "subrequests" array — they're already answered.
   Examples → service_request:
   - "I need catering for 35"
   - "Find me a DJ"
   - "Necesito un DJ para sábado"
   - "Plan a birthday party"
   - "Show me cheaper options" (refining)
   - "What about Saturday?" (refining)

4. When genuinely in doubt and the message names a concrete service CATEGORY without any specific business name and isn't clearly a question about the network → service_request.

Disambiguation: "are there DJs in Heredia?" is network_inquiry (asking IF the network has them). "find me a DJ in Heredia" is service_request (asking us to surface options). "compare the DJs you showed" is chat (about already-shown results).

Other rules:
- For unknown fields, use empty string '' — do NOT invent values, do NOT write 'unspecified', 'flexible', 'any', etc.
- Keep stated values short and human-readable.
- Output must be valid JSON parseable by JSON.parse — NOTHING else.

Multi-service requests (OPTIONAL "subrequests" field):

When a SERVICE_REQUEST message names TWO OR MORE distinct service categories that a single supplier would NOT reasonably offer together (a cleaning company doesn't cater, a DJ doesn't do AC repair), also emit a "subrequests" array — one entry per distinct service, up to 3 entries. Each entry has its own service/when/people/location/budget/dietary — inherited from the top-level fields where the user didn't specify per-service.

Emit "subrequests" ONLY when:
- The intent is service_request, AND
- The message clearly separates services with "and", "plus", "también", "y también", "y para", commas between services, or sentence breaks, AND
- The services are semantically distinct (catering vs cleaning vs DJ vs photography vs AC repair vs moving vs bakery vs decor).

Do NOT emit subrequests when:
- The user names one service with modifiers ("catering with wine pairing" is ONE service).
- Both parts describe the same event that one provider typically handles ("DJ with lights" is ONE service).
- The user is asking about network coverage (network_inquiry).

Examples with subrequests:
- "I need cleaning on Saturday and catering on Sunday" →
    "service": "Cleaning", "when": "Saturday", ...,
    "subrequests": [
      { "service": "Cleaning", "when": "Saturday" },
      { "service": "Catering", "when": "Sunday" }
    ]
- "Necesito un DJ para el sábado, catering para 40 personas y un fotógrafo" →
    "service": "DJ", "when": "sábado", "people": "40 people", ...,
    "subrequests": [
      { "service": "DJ", "when": "sábado" },
      { "service": "Catering", "people": "40 people" },
      { "service": "Photography" }
    ]

Examples WITHOUT subrequests:
- "I need catering for 40 people" → single service, omit subrequests
- "DJ with lights and sound" → single service, omit subrequests
- "Cleaning with eco-friendly products" → single service, omit subrequests

When emitting subrequests, the top-level fields should still reflect the FIRST subrequest (so downstream code that only reads the top-level fields still works).

Conversation context:
The input may contain an "Earlier user messages" section and a "Current message" section. Parse the CURRENT message. Use earlier messages ONLY to fill a field the current message leaves out when it is clearly a follow-up of the same request ("y en Cartago?" keeps the earlier service and changes the location; "para 50 personas" keeps the earlier service). If the current message names its own service, ignore earlier services entirely. "subrequests" may only contain services named in the CURRENT message.
Output must be valid JSON parseable by JSON.parse — NOTHING else.`;

const FALLBACK_QUERY: ParsedQuery = {
  service: '',
  people: '',
  location: '',
  budget: '',
  when: '',
  intent: 'service_request',
};

/**
 * Belt-and-suspenders check for the LLM parser: certain phrasings are so
 * unambiguously chat-intent that we override whatever the model returned.
 * Catches cases where the model gets confused by category words appearing
 * inside a business name (e.g. "DJ Carlos Mora") and flips back to
 * service_request.
 */
const QUESTION_PREFIX_RE =
  /^\s*(?:y\s+|and\s+|¿|\?)?\s*(?:dónde|donde|where|cuál|cual|which|qué|que|what|cómo|como|how|cuándo|cuando|when|quién|quien|who|háblame|tell\s+me|cuéntame|cuentame)\b/i;

const SEARCH_VERB_RE =
  /\b(?:find|busco|necesito|need|show\s+me|muéstrame|muestrame|recomi[ée]ndame|recommend|encu[ée]ntrame|plan\s+(?:a|me)|i\s+want|quiero|book)\b/i;

/**
 * Detects additive follow-ups that introduce a NEW service on top of a
 * prior search — "I also need cleaning", "y también necesito un DJ",
 * "and I need a photographer". Once prior providers are on screen the
 * LLM parser often mis-classifies these as `chat` (treating them as
 * conversation about existing cards). This regex is the deterministic
 * upgrade: if it fires we force `service_request` so a fresh search
 * runs for the newly-mentioned service.
 */
const ADDITIVE_FOLLOWUP_RE =
  /\b(?:(?:also|and)\s+(?:i\s+)?(?:need|want|would\s+like|require|am\s+looking\s+for)|(?:y\s+)?tambi[eé]n\s+(?:necesito|quiero|busco|ocupo))\b/i;

export function isAdditiveFollowupRequest(message: string): boolean {
  return ADDITIVE_FOLLOWUP_RE.test(message.trim());
}

/**
 * Detects when the user is explicitly asking for provider results or options
 * to be shown — in both English and Spanish. Used as an exception to the rule
 * that keeps intent = 'chat' when providers have already been shown on screen.
 * Without this, "show me more options" after a conversation would stay in chat
 * mode and never trigger a new search.
 */
// Optional adjectives that can appear between "me" / "nos" and the result noun:
// "show me available options", "show me more affordable providers", etc.
const _ADJ = '(?:(?:more|available|other|different|new|cheap|affordable|better|other|additional|alternative|nearby|local)\\s+)*';

// Nouns that refer to a list of results/providers.
const _NOUN = '(?:options?|results?|providers?|suppliers?|choices?|alternatives?)';

const EXPLICIT_RESULTS_RE = new RegExp(
  '\\b(?:' +
  // English — "show me (adj*) results/options/providers"
  `show\\s+(?:me\\s+)?${_ADJ}${_NOUN}|` +
  // English — "show more" (bare)
  'show\\s+more|' +
  // English — "find me (adj*) options"
  `find\\s+(?:me\\s+)?${_ADJ}${_NOUN}|` +
  // English — "search for (adj*) options"
  `search\\s+(?:for\\s+)?${_ADJ}${_NOUN}|` +
  // English — bare adjectives: "more options", "different providers"
  `(?:more|different|other)\\s+${_NOUN}|` +
  // English — "any (more) options?", "any others?"
  `any\\s+(?:more\\s+)?${_NOUN}|any\\s+others?|` +
  // English — "are there (any) more options?"
  `are\\s+there\\s+(?:any\\s+)?(?:more\\s+)?${_NOUN}|` +
  // English — "can/could I see more"
  `can\\s+I\\s+see\\s+(?:more|${_NOUN}|more\\s+${_NOUN})|` +
  // English — "what else do you have / is available"
  'what\\s+else\\s+(?:do\\s+you\\s+have|is\\s+(?:there|available)|can\\s+you\\s+(?:find|show))|' +
  // English — "anything else (available)?"
  'anything\\s+else(?:\\s+(?:available|out\\s+there))?|' +
  // English — "got any more options"
  `got\\s+(?:any\\s+)?(?:more|other)\\s+${_NOUN}|` +
  // English — "can you show me …" / "could you find me …" (polite conversational)
  `(?:can|could|please)\\s+(?:you\\s+)?(?:show|find|search|give)\\s+(?:me\\s+)?${_ADJ}${_NOUN}|` +
  // Spanish — imperative show verbs
  'mu[eé]str[aá]me|muestrame|mu[eé]str[aá]nos|' +
  // Spanish — "busca(me) / buscar opciones"
  'b[uú]sca(?:me|nos)?|buscar\\s+(?:m[aá]s\\s+)?(?:opciones?|resultados?|proveedores?)|' +
  // Spanish — "ver (más) opciones / resultados"
  'ver\\s+(?:m[aá]s\\s+)?(?:opciones?|resultados?|proveedores?)|' +
  // Spanish — "más opciones / resultados"
  'm[aá]s\\s+(?:opciones?|resultados?|proveedores?)|' +
  // Spanish — "hay (más) opciones?"
  'hay\\s+(?:m[aá]s\\s+)?(?:opciones?|resultados?|proveedores?)|' +
  // Spanish — "algo más", "qué más tienes / hay"
  'algo\\s+m[aá]s|qu[eé]\\s+m[aá]s\\s+(?:tienes?|hay|tienen)|' +
  // Spanish — "tienes más opciones?"
  'tienes?\\s+(?:m[aá]s\\s+)?(?:opciones?|resultados?|proveedores?)|' +
  // Spanish — "otras / diferentes opciones"
  'otras?\\s+(?:opciones?|proveedores?)|diferentes?\\s+(?:opciones?|proveedores?)|' +
  // Spanish — "dame (más) opciones"
  'dame\\s+(?:m[aá]s\\s+)?(?:opciones?|resultados?|proveedores?)' +
  ')\\b',
  'i',
);

/** True when the user is explicitly requesting results/options to be shown. */
export function wantsMoreResults(message: string): boolean {
  return EXPLICIT_RESULTS_RE.test(message.trim());
}

// Allow camelCase names like "PikiTiki" or "DJCarlos" — the first char must be
// uppercase, then anything until a word boundary (no lowercase-only constraint).
// Matches provider-style proper names only — excludes plain one-word brand names
// like "Solvo" (the app itself). Requires either:
//   1. Two or more capitalized words ("Mesa Fina", "Sabor Catering", "DJ Carlos Mora")
//   2. A single camelCase word ("PikiTiki" — uppercase letter appears mid-word)
const CAPITALIZED_NAME_RE =
  /\b(?:[A-ZÁÉÍÓÚÑ][A-Za-záéíóúñ]+\s+[A-ZÁÉÍÓÚÑ][A-Za-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][A-Za-záéíóúñ]+){0,4}|[A-ZÁÉÍÓÚÑ][a-záéíóúñ]*[A-ZÁÉÍÓÚÑ][A-Za-záéíóúñ]*)\b/;

/**
 * Country-agnostic extraction of an explicitly-stated location from free
 * text. Instead of matching against a hardcoded city list (which doesn't
 * scale beyond one market), we detect the GRAMMAR of a location mention:
 * a locative preposition followed by a proper-noun place name.
 *
 * Works globally — "...in Tokyo", "...en Madrid", "...near Austin",
 * "...cerca de Lima" all resolve. The place name must be capitalized, which
 * is what separates "in Tokyo" (a place) from "in catering" (a service).
 *
 * This is a deterministic safety net: the LLM parser is still the primary
 * extractor, but when the user clearly typed a place it should reach the
 * search even if the model drops it or device-coordinate inference would
 * otherwise win.
 *
 * Note: prepositions are spelled with explicit case variants rather than the
 * `i` flag, because the `i` flag also makes the `\p{Lu}` (uppercase letter)
 * escape case-insensitive — which would defeat the proper-noun requirement.
 */
const EXPLICIT_LOCATION_RE =
  /(?:\b(?:[Ii]n|[Aa]t|[Nn]ear|[Aa]round|[Ee]n)\b|\b[Cc]erca de\b|\b[Cc]lose to\b)\s+(\p{Lu}[\p{L}.'-]*(?:\s+(?:de|del|da|do|\p{Lu}[\p{L}.'-]*)){0,3})/u;

/**
 * Service-category words that can appear capitalized right after a
 * preposition ("interested In Catering") — bounded set in this marketplace,
 * so a tiny stop-list keeps them from being mistaken for a location.
 */
const NON_LOCATION_WORDS = new Set([
  'catering',
  'dj',
  'photography',
  'cleaning',
  'bakery',
  'moving',
  'decor',
  'service',
  'services',
]);

export function detectExplicitLocation(message: string): string | null {
  if (!message) return null;
  const match = message.match(EXPLICIT_LOCATION_RE);
  if (!match) return null;

  // Trim any trailing lowercase connector the greedy capture pulled in
  // (e.g. "San Pedro de" → "San Pedro").
  const place = match[1]
    .replace(/\s+(?:de|del|da|do)$/i, '')
    .trim();

  if (!place) return null;
  if (NON_LOCATION_WORDS.has(place.toLowerCase())) return null;
  return place;
}

function looksLikeQuestionAboutNamedEntity(message: string): boolean {
  const trimmed = message.trim();
  if (!trimmed) return false;

  // Explicit search-verb wins (e.g. "find me a DJ named Carlos").
  if (SEARCH_VERB_RE.test(trimmed)) return false;

  const startsWithQuestion = QUESTION_PREFIX_RE.test(trimmed);
  const hasCapitalizedName = CAPITALIZED_NAME_RE.test(trimmed);
  const isShortReferent = /^\s*(?:y|and|qué\s+tal|que\s+tal|what\s+about)\s+/i.test(
    trimmed,
  );

  // "Where is PikiTiki?" / "Donde esta DJ Carlos Mora?" → yes
  if (startsWithQuestion && hasCapitalizedName) return true;

  // "y Piki Tiki?" → yes (short referent follow-up)
  if (isShortReferent && hasCapitalizedName) return true;

  return false;
}

/**
 * Unambiguous reference to a result ALREADY on screen — "the first result",
 * "the last one", "second option", "primer resultado", "última opción". When
 * the user is talking about cards already shown, the turn is `chat`: they
 * want analysis of existing results, not a fresh search. Deterministic
 * override for when the LLM gets fooled by words like "comparison".
 */
// Note: \b doesn't anchor on accented characters (ú, ó, etc.) in JS without
// the `u` flag and Unicode property escapes. We use (?<!\w) / (?!\w) as a
// portable alternative so Spanish ordinals like "última opción" match correctly.
const ORDINAL_RESULT_REF_RE =
  /(?<!\w)(?:the\s+)?(?:first|second|third|fourth|fifth|last|1st|2nd|3rd|4th|5th|primer[oa]?|segund[oa]|tercer[oa]?|cuart[oa]|quint[oa]|[úu]ltim[oa])\s+(?:result|one|option|provider|card|pick|resultado|opci[óo]n|proveedor|tarjeta)s?(?!\w)/i;

function referencesShownResults(message: string): boolean {
  return ORDINAL_RESULT_REF_RE.test(message.trim());
}

/**
 * Phrasing that asks ABOUT the supplier network/inventory in general —
 * "are there any suppliers in our network?", "do you have providers in
 * Heredia?", "qué proveedores tienen?". Deterministic override so the
 * `network_inquiry` intent works even when a weaker model (e.g.
 * gpt-4o-mini) misclassifies it as a service request. Requires explicit
 * supplier/provider/network vocabulary so it doesn't catch generic
 * "do you have ..." questions.
 */
const NETWORK_INQUIRY_RE =
  /\b(?:(?:in|en)\s+(?:our|your|su|la|nuestra)\s+(?:network|red)|are\s+there\s+(?:any\s+)?(?:suppliers?|providers?|proveedor(?:es)?)|hay\s+(?:alg[úu]n[oa]?s?\s+)?(?:proveedor(?:es)?|suppliers?|negocios?)|who(?:'s|\s+is)?\s+(?:in|on)\s+(?:our|your)\s+network|what\s+(?:suppliers?|providers?|services?|categories|categor[íi]as)\s+(?:do\s+you\s+have|are\s+(?:there|available)|tienen|hay)|qu[ée]\s+(?:proveedor(?:es)?|servicios?|categor[íi]as)\s+(?:tienen|hay|ofrecen)|tienen\s+(?:proveedor(?:es)?|suppliers?)|do\s+you\s+(?:have|carry|offer)\s+(?:any\s+)?(?:suppliers?|providers?|proveedor(?:es)?|[A-Za-z\s]{2,20})\s+in|is\s+there\s+(?:a(?:nyone?|nybody)?|someone|alguien)\s+(?:who|that|que)\s+(?:does?|can|provide?s?|hace?|ofrece?)|do\s+you\s+have\s+(?:any\s+)?(?:[A-Z][a-z]+s?|dj|djs|ac|[a-z]{3,15})\s+(?:in|near|around|en|cerca))\b/i;

/** @internal exported for unit tests */
export function looksLikeNetworkInquiry(message: string): boolean {
  return NETWORK_INQUIRY_RE.test(message.trim());
}

/**
 * "Which one of THOSE are in our network?" / "are THESE on the network?" —
 * referential pronouns ("those", "these", "them") combined with network
 * vocabulary means the user is asking about providers ALREADY SHOWN on
 * screen, not asking whether the network carries a category in general.
 * This must override `looksLikeNetworkInquiry` so the turn stays in `chat`
 * mode where the grounding block answers the question from known data.
 */
const REFERENTIAL_NETWORK_RE =
  /\b(?:those|these|them|that\s+one|this\s+one)\b.{0,80}\b(?:(?:in|on|from)\s+(?:our|your|su|nuestra)\s+(?:network|red)|en\s+(?:nuestra|la)\s+red)\b/i;

/** @internal exported for unit tests */
export function referencesShownResultsAboutNetwork(message: string): boolean {
  return REFERENTIAL_NETWORK_RE.test(message.trim());
}

/** @internal exported for unit tests */

function stripJsonFences(text: string): string {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

/**
 * Classify the user's latest message and extract what / where.
 * @param current  the message just sent
 * @param earlier  up to two previous user messages, only for follow-ups like
 *                 "y en Cartago?" — they never add topics of their own
 */
export async function parseQuery(
  current: string,
  earlier: string[],
  complete: Completer,
): Promise<ParsedQuery> {
  const trimmed = current.trim();
  if (!trimmed) {
    return { ...FALLBACK_QUERY };
  }
  const input = earlier.length
    ? `Earlier user messages (context only):\n${earlier.map((m) => `- ${m}`).join('\n')}\n\nCurrent message (parse THIS one):\n${trimmed}`
    : trimmed;

  // PARSE_SYSTEM_PROMPT is fully static → cachedSystem (provider-side caching).
  const cleaned = stripJsonFences(await complete(input, PARSE_SYSTEM_PROMPT));

  // Normalize values that the model uses to mean "I don't know"
  const isEmpty = (v: unknown) => {
    if (v == null) return true;
    const s = String(v).trim().toLowerCase();
    return (
      s === '' ||
      s === 'unspecified' ||
      s === 'flexible' ||
      s === 'any' ||
      s === 'n/a' ||
      s === 'none' ||
      s === 'soon'
    );
  };

  let parsed: ParsedQuery;
  try {
    const obj = JSON.parse(cleaned);
    // Coerce anything the model returns into our three-valued intent.
    // Default to `service_request` for unrecognised values — keeping
    // provider generation on for ambiguous turns is the safer error.
    const rawIntent = String(obj.intent ?? '').toLowerCase().trim();
    let intent: QueryIntent =
      rawIntent === 'chat'
        ? 'chat'
        : rawIntent === 'network_inquiry'
          ? 'network_inquiry'
          : 'service_request';

    // Belt-and-suspenders: deterministically override the LLM's intent for
    // unambiguous phrasings in the CURRENT message (the fallback model can
    // misclassify these).
    const lastTurn = trimmed;
    if (
      looksLikeQuestionAboutNamedEntity(lastTurn) ||
      // "compare the first and last result" — about cards already on screen.
      referencesShownResults(lastTurn) ||
      // "which one of THOSE are in our network?" — "those/these/them" always
      // refers to providers already shown; route to chat so grounding answers.
      referencesShownResultsAboutNetwork(lastTurn)
    ) {
      // Highest priority — a question about a specific named provider,
      // about results already shown, or a referential follow-up about shown
      // results and network membership, is always conversational.
      intent = 'chat';
    } else if (
      // "are there suppliers in our network?" — asking ABOUT the network.
      // Skip when an explicit search verb is present ("find me suppliers in
      // your network" → the user wants options/cards, not a text answer).
      looksLikeNetworkInquiry(lastTurn) &&
      !SEARCH_VERB_RE.test(lastTurn)
    ) {
      intent = 'network_inquiry';
    } else if (
      wantsMoreResults(lastTurn) ||
      isAdditiveFollowupRequest(lastTurn)
    ) {
      // "show me more options" / "search outside your network" / "I also
      // need cleaning" — the LLM often classifies these as `chat` when
      // prior providers are already on screen. Deterministic upgrade so a
      // fresh search always runs for a genuinely-new topic.
      intent = 'service_request';
    }

    // A place typed in the current message ("...en Heredia") always wins over
    // the model's extraction; the backend then resolves it to a province.
    const explicitLocation = detectExplicitLocation(trimmed);
    const llmLocation = isEmpty(obj.location) ? '' : String(obj.location);

    // Multi-service split. Only surface `subrequests` for `service_request`
    // intents (parser can't split "compare these" into topics), require an
    // array of ≥ 2 entries with real service strings, and cap at 3 so a
    // "list 10 things" message can't fan out to 10 embeddings + 10 chat
    // completions per turn.
    const rawSubs = Array.isArray(obj.subrequests) ? obj.subrequests : [];
    const subs: SubRequest[] = rawSubs
      .filter((r: any) => r && typeof r === 'object' && !isEmpty(r.service))
      .slice(0, 3)
      .map((r: any) => ({
        service: String(r.service),
        people: !isEmpty(r.people) ? String(r.people) : undefined,
        location: !isEmpty(r.location) ? String(r.location) : undefined,
        budget: !isEmpty(r.budget) ? String(r.budget) : undefined,
        when: !isEmpty(r.when) ? String(r.when) : undefined,
        dietary: !isEmpty(r.dietary) ? String(r.dietary) : undefined,
      }));

    parsed = {
      intent,
      service: String(obj.service ?? FALLBACK_QUERY.service),
      people: isEmpty(obj.people) ? '' : String(obj.people),
      location: explicitLocation ?? llmLocation,
      budget: isEmpty(obj.budget) ? '' : String(obj.budget),
      when: isEmpty(obj.when) ? '' : String(obj.when),
      dietary: !isEmpty(obj.dietary) ? String(obj.dietary) : undefined,
      subrequests: intent === 'service_request' && subs.length >= 2 ? subs : undefined,
    };
  } catch {
    parsed = { ...FALLBACK_QUERY };
  }

  return parsed;
}

