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
  ): Promise<ChatResponseDto> {
    if (!this.client) {
      throw new InternalServerErrorException(
        'GEMINI_API_KEY is not configured',
      );
    }

    const contents = messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const res = await this.client.models.generateContent({
      model: this.modelId,
      contents,
      config: system ? { systemInstruction: system } : undefined,
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
