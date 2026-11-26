import { ChatSupplier } from './chat-supplier';
import { ParsedQuery } from './intent';

/**
 * Stable system prompt for every chat reply. Sent as `cachedSystem` so
 * Claude caches it; the per-turn grounding (built below) goes in `system`.
 * Editing this changes how the assistant behaves for everyone — test a few
 * turns in both languages after any change.
 */
export const CHAT_SYSTEM_PROMPT = `You are Solvo, an assistant that connects people in Costa Rica with local service providers (plumbers, electricians, cleaners, DJs…) and product or material suppliers (bakeries, hardware stores, building materials…).

RULES — follow exactly:
1. LANGUAGE: reply in the language of the user's latest message (Spanish or English). Never mix. In Spanish use "usted".
2. ONLY REAL SUPPLIERS: you may only mention suppliers listed in the context blocks below or earlier in this conversation. NEVER invent a business, a phone number, an email, a website, a price or a review. If nothing matches, say so honestly.
3. ZONE: searches are limited to one province. The "## Search result" block says which one. If 0 suppliers were found there, say that plainly for that province and suggest a neighboring province (they can just name it) or describing the need with other words. If the zone is "unknown", the results are from the whole country — say so and ask which province they need it in.
4. CARDS: in a service request, the supplier cards are shown BELOW your message at the same moment. Speak in present tense ("Here are 3 plumbers that serve Heredia"). Do not list every business again; you may highlight one or two with a short reason (rating, specialty, preferred). NEVER say "one moment", "let me search" or anything implying results are still coming.
5. NETWORK QUESTIONS ("## Network lookup"): no cards are shown — answer in text from the listed data (counts, names, provinces).
6. CONTACT: Solvo connects people directly, there is no booking. When asked how to reach a supplier, give the phone / WhatsApp / email / website from the data, or tell them to tap "Contact" on the card. Never say contact info is hidden. If a supplier has no contact field, say you don't have it.
7. FOLLOW-UPS ("## Known suppliers"): answer questions about suppliers already shown using only that data.
8. STYLE: 1–3 sentences for searches, up to 5 for questions. At most one clarifying question. No markdown headers, no bullet lists.`;

/** The API rejects grounding over this size anyway (cost guard). */
export const MAX_GROUNDING_CHARS = 11500;

export function formatSuppliers(list: ChatSupplier[]): string {
  return list
    .map((s, i) =>
      [
        `${i + 1}. ${s.companyName}`,
        s.tagline && `tagline: ${s.tagline}`,
        `based in: ${[s.city, s.provinceName].filter(Boolean).join(', ') || 'unknown'}`,
        s.serviceProvinceNames.length && `serves: ${s.serviceProvinceNames.join(', ')}`,
        s.categories.length && `categories: ${s.categories.map((c) => c.nameEn).join(', ')}`,
        s.skills.length && `specialties: ${s.skills.join(', ')}`,
        s.reviewCount > 0 ? `rating: ${Number(s.rating).toFixed(1)} (${s.reviewCount} reviews)` : 'rating: no reviews yet',
        s.services.length &&
          `services: ${s.services
            .map((sv) =>
              sv.priceFrom
                ? `${sv.name} from ₡${Number(sv.priceFrom).toLocaleString('en-US')}${sv.priceUnit ? `/${sv.priceUnit}` : ''}`
                : sv.name,
            )
            .join('; ')}`,
        s.verified && 'verified by Solvo',
        s.preferred && 'preferred supplier',
        s.businessPhone && `phone: ${s.businessPhone}`,
        s.whatsappNumber && `whatsapp: ${s.whatsappNumber}`,
        s.businessEmail && `email: ${s.businessEmail}`,
        s.websiteUrl && `website: ${s.websiteUrl}`,
      ]
        .filter(Boolean)
        .join(' | '),
    )
    .join('\n');
}

function zoneLine(zoneName: string | null): string {
  return zoneName
    ? `zone: ${zoneName} province (only suppliers serving it were searched)`
    : 'zone: unknown (searched the whole country)';
}

export function searchResultContext(list: ChatSupplier[], parsed: ParsedQuery, zoneName: string | null): string {
  const what = parsed.service ? `"${parsed.service}"` : 'any supplier';
  if (list.length === 0) {
    return `## Search result\n${zoneLine(zoneName)}\nrequest: ${what}\n0 suppliers found — NO cards are shown. Say so honestly; do not invent any.`;
  }
  return `## Search result\n${zoneLine(zoneName)}\nrequest: ${what}\n${list.length} supplier card(s) are shown below your message right now:\n${formatSuppliers(list)}`;
}

export function networkContext(list: ChatSupplier[], parsed: ParsedQuery, zoneName: string | null): string {
  return (
    `## Network lookup\n${zoneLine(zoneName)}\nquestion about: ${parsed.service || 'the supplier network'}\n` +
    (list.length === 0
      ? '0 suppliers match. Say so honestly. No cards are shown.'
      : `${list.length} matching supplier(s), NO cards are shown — answer in text:\n${formatSuppliers(list)}`)
  );
}

export function knownSuppliersContext(shown: ChatSupplier[]): string {
  return shown.length
    ? `## Known suppliers (shown earlier — answer only from this data). NO new cards are shown with this reply, so never say "below".\n${formatSuppliers(shown)}`
    : '## Conversation\nAnswer from the conversation history. If they need a supplier, ask what and where.';
}
