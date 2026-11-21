import { ChatMessageDto, ChatResponseDto, ModelKey } from '../dto';

export interface ChatProvider {
  readonly key: ModelKey;
  /** False when the provider's API key isn't set — ChatService skips it. */
  isConfigured(): boolean;
  /**
   * @param messages     conversation turns, oldest first
   * @param system       the DYNAMIC part of the system prompt (per-turn grounding)
   * @param cachedSystem the STABLE prefix (base instructions). Anthropic marks
   *                     it for prompt caching; Gemini just prepends it.
   */
  send(messages: ChatMessageDto[], system?: string, cachedSystem?: string): Promise<ChatResponseDto>;
}
