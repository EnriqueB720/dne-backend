import { SupportedModel } from './chat-request.dto';

export interface ChatUsage {
  inputTokens?: number;
  outputTokens?: number;
}

export class ChatResponseDto {
  content: string;
  model: SupportedModel;
  usage?: ChatUsage;
}
