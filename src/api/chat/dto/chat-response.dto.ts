import { ModelKey } from './chat-request.dto';

export interface ChatUsage {
  inputTokens?: number;
  outputTokens?: number;
}

export class ChatResponseDto {
  content: string;
  /** The provider that actually answered (after any fallback). */
  model: ModelKey;
  usage?: ChatUsage;
}
