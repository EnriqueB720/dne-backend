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
    cachedSystem?: string,
  ): Promise<ChatResponseDto> {
    if (!this.client) {
      throw new InternalServerErrorException(
        'ANTHROPIC_API_KEY is not configured',
      );
    }

    // Build the system prompt as content blocks. The stable prefix
    // (`cachedSystem`) is marked `cache_control: ephemeral` so Anthropic
    // caches it — subsequent turns within the 5-minute window read it from
    // cache instead of re-billing/re-processing the full base prompt. The
    // dynamic per-turn grounding (`system`) follows uncached.
    const systemBlocks: Anthropic.TextBlockParam[] = [];
    if (cachedSystem) {
      systemBlocks.push({
        type: 'text',
        text: cachedSystem,
        cache_control: { type: 'ephemeral' },
      });
    }
    if (system) {
      systemBlocks.push({ type: 'text', text: system });
    }

    const res = await this.client.messages.create({
      model: this.modelId,
      max_tokens: 1024,
      system: systemBlocks.length > 0 ? systemBlocks : undefined,
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
