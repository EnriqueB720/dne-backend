import { Injectable, InternalServerErrorException } from '@nestjs/common';
import OpenAI from 'openai';
import { ChatMessageDto, ChatResponseDto } from '../dto';
import { ChatProvider } from './chat-provider.interface';

@Injectable()
export class OpenAiProvider implements ChatProvider {
  readonly key = 'gpt-4o-mini' as const;
  private readonly modelId = 'gpt-4o-mini';
  private readonly client: OpenAI | null;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    this.client = apiKey ? new OpenAI({ apiKey }) : null;
  }

  async send(
    messages: ChatMessageDto[],
    system?: string,
    cachedSystem?: string,
  ): Promise<ChatResponseDto> {
    if (!this.client) {
      throw new InternalServerErrorException(
        'OPENAI_API_KEY is not configured',
      );
    }

    // OpenAI caches long prompt prefixes automatically (no explicit
    // cache_control API), so we just concatenate the stable prefix and the
    // dynamic grounding into one system message.
    const fullSystem = [cachedSystem, system]
      .filter((s): s is string => !!s)
      .join('\n\n');

    const payload: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];
    if (fullSystem) payload.push({ role: 'system', content: fullSystem });
    for (const m of messages) {
      payload.push({ role: m.role, content: m.content });
    }

    const res = await this.client.chat.completions.create({
      model: this.modelId,
      max_tokens: 1024,
      messages: payload,
    });

    const text = res.choices[0]?.message?.content ?? '';

    return {
      content: text,
      model: this.key,
      usage: {
        inputTokens: res.usage?.prompt_tokens,
        outputTokens: res.usage?.completion_tokens,
      },
    };
  }
}
