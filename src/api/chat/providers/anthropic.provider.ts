import Anthropic from '@anthropic-ai/sdk';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ChatMessageDto, ChatResponseDto } from '../dto';
import { ChatProvider } from './chat-provider.interface';

@Injectable()
export class AnthropicProvider implements ChatProvider {
  readonly key = 'claude-haiku' as const;
  private readonly modelId = 'claude-haiku-4-5-20251001';
  private readonly client: Anthropic | null;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    this.client = apiKey ? new Anthropic({ apiKey }) : null;
  }

  async send(
    messages: ChatMessageDto[],
    system?: string,
  ): Promise<ChatResponseDto> {
    if (!this.client) {
      throw new InternalServerErrorException(
        'ANTHROPIC_API_KEY is not configured',
      );
    }

    const res = await this.client.messages.create({
      model: this.modelId,
      max_tokens: 1024,
      system,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });

    const text = res.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('');

    return {
      content: text,
      model: this.key,
      usage: {
        inputTokens: res.usage?.input_tokens,
        outputTokens: res.usage?.output_tokens,
      },
    };
  }
}
