import Anthropic from '@anthropic-ai/sdk';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ChatMessageDto, ChatResponseDto } from '../dto';
import { ChatProvider } from './chat-provider.interface';

/**
 * Primary chat model. ANTHROPIC_MODEL overrides the id (e.g. to try
 * `claude-haiku-5-5`, which is cheaper but thinks by default — re-test the
 * JSON intent parser before switching).
 */
@Injectable()
export class AnthropicProvider implements ChatProvider {
  readonly key = 'claude-haiku' as const;
  private readonly modelId = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5';
  private readonly client: Anthropic | null;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    this.client = apiKey ? new Anthropic({ apiKey }) : null;
  }

  isConfigured(): boolean {
    return this.client != null;
  }

  async send(messages: ChatMessageDto[], system?: string, cachedSystem?: string): Promise<ChatResponseDto> {
    if (!this.client) {
      throw new InternalServerErrorException('ANTHROPIC_API_KEY is not configured');
    }

    // Stable prefix is cached (5-minute ephemeral cache); per-turn grounding
    // follows uncached so it never invalidates the prefix.
    const systemBlocks: Anthropic.TextBlockParam[] = [];
    if (cachedSystem) {
      systemBlocks.push({ type: 'text', text: cachedSystem, cache_control: { type: 'ephemeral' } });
    }
    if (system) systemBlocks.push({ type: 'text', text: system });

    const res = await this.client.messages.create({
      model: this.modelId,
      max_tokens: 1024,
      system: systemBlocks.length > 0 ? systemBlocks : undefined,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });

    if (res.stop_reason === 'refusal') {
      // Let ChatService fall back to Gemini rather than show an empty reply.
      throw new Error('Claude declined the request');
    }

    const text = res.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('');

    return {
      content: text,
      model: this.key,
      usage: { inputTokens: res.usage?.input_tokens, outputTokens: res.usage?.output_tokens },
    };
  }
}
