import { ChatMessageDto, ChatResponseDto, SupportedModel } from '../dto';

export interface ChatProvider {
  readonly key: SupportedModel;
  send(messages: ChatMessageDto[], system?: string): Promise<ChatResponseDto>;
}

export const CHAT_PROVIDERS = Symbol('CHAT_PROVIDERS');
