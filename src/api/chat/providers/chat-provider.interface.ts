import { ChatMessageDto, ChatResponseDto, SupportedModel } from '../dto';

export interface ChatProvider {
  readonly key: SupportedModel;
  /**
   * @param messages       conversation turns
   * @param system         the DYNAMIC part of the system prompt (per-turn
   *                       grounding) — changes every call, never cached
   * @param cachedSystem   the STABLE prefix of the system prompt (the base
   *                       instructions). Providers that support prompt
   *                       caching (Anthropic) mark this for caching so it
   *                       isn't re-billed/re-processed every turn; others
   *                       simply prepend it.
   */
  send(
    messages: ChatMessageDto[],
    system?: string,
    cachedSystem?: string,
  ): Promise<ChatResponseDto>;
}

export const CHAT_PROVIDERS = Symbol('CHAT_PROVIDERS');
