import { ChatMessageDto } from './chat-message.dto';

/**
 * Provider keys. The client never chooses one: ChatService always tries
 * Claude first and falls back to Gemini (see PROVIDER_CHAIN).
 */
export type ModelKey = 'claude-haiku' | 'gemini-flash';

export interface ChatRequestDto {
  messages: ChatMessageDto[];
  /** Per-turn (dynamic) system prompt — never cached. */
  system?: string;
  /** Stable system-prompt prefix, marked for provider-side prompt caching. */
  cachedSystem?: string;
  /** Attributes the usage row to a user (null for guests). */
  userId?: number;
}
