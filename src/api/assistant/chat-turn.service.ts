import { Injectable } from '@nestjs/common';

import { GeoService } from '../../shared/geo';
import { ChatService } from '../chat/chat.service';
import { CallerIdentity, ConversationService } from '../chat/conversation.service';
import { ChatMessageDto } from '../chat/dto';
import { SupplierService } from '../supplier/supplier.service';
import { CHAT_CARD_SELECT, ChatSupplier, parseStoredSuppliers, toChatSupplier } from './chat-supplier';
import { isAdditiveFollowupRequest, ParsedQuery, parseQuery, wantsMoreResults } from './intent';
import {
  CHAT_SYSTEM_PROMPT,
  knownSuppliersContext,
  MAX_GROUNDING_CHARS,
  networkContext,
  searchResultContext,
} from './prompts';

/** Max cards per search. We show every match up to this — never pad. */
const RESULT_LIMIT = 10;
const NETWORK_LIMIT = 15;

/** "find", "busco", "necesito"… → a new search even when cards are on screen. */
const SEARCH_ACTION_RE =
  /\b(?:look(?:\s+(?:for|inside|at|around))?|search(?:\s+for)?|find(?:\s+me)?|show(?:\s+me)?|get(?:\s+me)?|give(?:\s+me)?|need|want|looking(?:\s+for)?|b[uú]sca(?:me|nos|r)?|necesito|ocupo|quiero|dame|mu[eé]str[aá](?:me|nos)?)\b/i;

/** "y en Heredia?", "what about in Cartago?" → same need, new place → search again. */
const LOCATION_FOLLOWUP_RE =
  /^\s*(?:y|and|what\s+about|how\s+about|qu[eé]\s+tal|e)\s+(?:en|in|para|por|cerca\s+de|near|around)\b/i;

/** "never mind", "olvídalo"… → ignore earlier messages when parsing. */
const CONTEXT_CLEAR_RE =
  /\b(?:never\s+mind|forget\s+(?:that|it|the|those|everything|all)?|scratch\s+that|start\s+over|olvida(?:te|lo|los|la|las)?(?:\s+(?:eso|lo\s+anterior|todo))?|mejor\s+no|al\s+final)\b/i;

export interface ChatTurnInput {
  conversationId?: string | null;
  message: string;
  /** Zone picked in the UI (ISO 3166-2). Ignored when the message names a place. */
  province?: string | null;
  /** Device position. Used only when nothing else says where. */
  lat?: number | null;
  lng?: number | null;
}

export interface ChatTurnReply {
  content: string;
  model: string;
  suppliers?: ChatSupplier[];
  service?: string;
  zoneName?: string | null;
}

/**
 * One chat turn, end to end, on the server:
 *   1. parse the message (intent + what + where)      — Claude → Gemini
 *   2. search the DB in ONE province                  — SupplierService.search
 *   3. reply grounded on exactly those suppliers      — Claude → Gemini
 *   4. persist user message + replies (only if the client is still waiting)
 * All prompts live in this folder; the client sends only the message and
 * where the user is.
 */
@Injectable()
export class ChatTurnService {
  constructor(
    private readonly chat: ChatService,
    private readonly conversations: ConversationService,
    private readonly suppliers: SupplierService,
    private readonly geo: GeoService,
  ) {}

  async run(input: ChatTurnInput, caller: CallerIdentity, isAborted: () => boolean) {
    const message = input.message.trim();
    const ctx = input.conversationId
      ? await this.conversations.turnContext(input.conversationId, caller)
      : { history: [], earlierUserMessages: [], lastSuppliersJson: null };
    const shown = parseStoredSuppliers(ctx.lastSuppliersJson);
    const userId = caller.userId ?? undefined;

    const fresh = CONTEXT_CLEAR_RE.test(message) || isAdditiveFollowupRequest(message);
    const parsed = await parseQuery(message, fresh ? [] : ctx.earlierUserMessages, (text, cachedSystem) =>
      this.chat.send({ messages: [{ role: 'user', content: text }], cachedSystem, userId }).then((r) => r.content),
    );

    // Once cards are on screen most follow-ups are questions about them —
    // unless the user clearly asks for a new search.
    if (
      wantsMoreResults(message) ||
      isAdditiveFollowupRequest(message) ||
      (LOCATION_FOLLOWUP_RE.test(message) && !!parsed.service)
    ) {
      parsed.intent = 'service_request';
    } else if (
      shown.length &&
      parsed.intent === 'service_request' &&
      !SEARCH_ACTION_RE.test(message) &&
      !parsed.location
    ) {
      parsed.intent = 'chat';
    }

    const reply = async (text: string, grounding: string) => {
      const messages: ChatMessageDto[] = [...ctx.history, { role: 'user', content: text }];
      const res = await this.chat.send({
        messages,
        system: grounding.slice(0, MAX_GROUNDING_CHARS),
        cachedSystem: CHAT_SYSTEM_PROMPT,
        userId,
      });
      return { content: res.content, model: res.model };
    };

    const replies: ChatTurnReply[] = [];
    if (parsed.intent === 'chat') {
      replies.push(await reply(message, knownSuppliersContext(shown)));
    } else if (parsed.intent === 'network_inquiry') {
      const { suppliers, zoneName } = await this.search(parsed, input, NETWORK_LIMIT);
      replies.push(await reply(message, networkContext(suppliers, parsed, zoneName)));
    } else if (parsed.subrequests && parsed.subrequests.length >= 2) {
      // "fontanero y electricista": one search + one reply per topic.
      for (const sub of parsed.subrequests.slice(0, 3)) {
        const subParsed: ParsedQuery = {
          ...parsed,
          ...sub,
          intent: 'service_request',
          location: sub.location ?? parsed.location,
          subrequests: undefined,
        } as ParsedQuery;
        const { suppliers, zoneName } = await this.search(subParsed, input, RESULT_LIMIT);
        const r = await reply(`(${subParsed.service}) ${message}`, searchResultContext(suppliers, subParsed, zoneName));
        replies.push({ ...r, suppliers, service: subParsed.service, zoneName });
      }
    } else {
      const { suppliers, zoneName } = await this.search(parsed, input, RESULT_LIMIT);
      const r = await reply(message, searchResultContext(suppliers, parsed, zoneName));
      replies.push({ ...r, suppliers, service: parsed.service, zoneName });
    }

    // The user pressed "stop" (connection closed): keep no trace of the turn.
    if (isAborted()) return null;

    const saved = await this.conversations.persistTurn(
      caller,
      input.conversationId ?? null,
      message,
      replies.map((r) => ({
        content: r.content,
        model: r.model,
        providersJson: r.suppliers ? JSON.stringify(r.suppliers) : null,
      })),
    );

    return {
      conversationId: saved.conversation.conversationId,
      title: saved.conversation.title,
      replies: saved.replies.map((m, i) => ({
        messageId: m.messageId,
        content: m.content,
        model: m.model ?? '',
        createdAt: m.createdAt,
        providersJson: m.providersJson,
        service: replies[i].service || null,
        zoneName: replies[i].zoneName ?? null,
      })),
    };
  }

  /** DB search in the right zone. A place typed in the message beats the picked zone. */
  private async search(parsed: ParsedQuery, input: ChatTurnInput, limit: number) {
    const typed = parsed.location?.trim() || null;
    const res = await this.suppliers.search(
      {
        query: parsed.service?.trim() || undefined,
        location: typed ?? undefined,
        province: typed ? undefined : (input.province ?? undefined),
        lat: typed || input.province ? undefined : (input.lat ?? undefined),
        lng: typed || input.province ? undefined : (input.lng ?? undefined),
        limit,
      },
      { select: CHAT_CARD_SELECT as any },
    );
    return {
      suppliers: res.suppliers.map((s) => toChatSupplier(s as any, this.geo)),
      zoneName: res.province?.name ?? null,
    };
  }
}
