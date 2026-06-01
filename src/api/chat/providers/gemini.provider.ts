import { GoogleGenAI } from '@google/genai';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ChatMessageDto, ChatResponseDto } from '../dto';
import { ChatProvider } from './chat-provider.interface';

@Injectable()
export class GeminiProvider implements ChatProvider {
  readonly key = 'gemini-flash' as const;
  private readonly modelId = 'gemini-2.5-flash';
  private readonly client: GoogleGenAI | null;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    this.client = apiKey ? new GoogleGenAI({ apiKey }) : null;
  }

  async send(
    messages: ChatMessageDto[],
    system?: string,
    cachedSystem?: string,
  ): Promise<ChatResponseDto> {
    if (!this.client) {
      throw new InternalServerErrorException(
        'GEMINI_API_KEY is not configured',
      );
    }

    // Gemini's explicit context caching needs a separate cache-create call;
    // for now we concatenate the stable prefix + dynamic grounding into the
    // system instruction (still benefits from any implicit caching).
    const fullSystem = [cachedSystem, system]
      .filter((s): s is string => !!s)
      .join('\n\n');

    const contents = messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const res = await this.client.models.generateContent({
      model: this.modelId,
      contents,
      config: fullSystem ? { systemInstruction: fullSystem } : undefined,
    });

    const text = res.text ?? '';

    return {
      content: text,
      model: this.key,
      usage: {
        inputTokens: res.usageMetadata?.promptTokenCount,
        outputTokens: res.usageMetadata?.candidatesTokenCount,
      },
    };
  }
}
