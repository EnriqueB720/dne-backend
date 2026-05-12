import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ChatRequestDto, ChatResponseDto, SupportedModel } from './dto';
import {
  AnthropicProvider,
  ChatProvider,
  GeminiProvider,
  OpenAiProvider,
} from './providers';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private readonly registry: Map<SupportedModel, ChatProvider>;

  constructor(
    anthropic: AnthropicProvider,
    openai: OpenAiProvider,
    gemini: GeminiProvider,
  ) {
    this.registry = new Map<SupportedModel, ChatProvider>([
      [anthropic.key, anthropic],
      [openai.key, openai],
      [gemini.key, gemini],
    ]);
  }

  async send(req: ChatRequestDto): Promise<ChatResponseDto> {
    const provider = this.registry.get(req.model);
    if (!provider) {
      throw new BadRequestException(`Unsupported model: ${req.model}`);
    }

    try {
      return await provider.send(req.messages, req.system);
    } catch (err) {
      this.logger.error(
        `Provider ${req.model} failed: ${err instanceof Error ? err.message : err}`,
      );
      throw err;
    }
  }
}
