import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import OpenAI from 'openai';

import { AiUsageLogService } from '../ai-usage-log/ai-usage-log.service';

/**
 * Small wrapper around OpenAI's embedding API. Kept independent of the
 * chat providers because embedding usage is very different (no fallback
 * chain, no streaming, batching matters).
 *
 * Model: `text-embedding-3-small` — 1536 dims, $0.02 per 1M input tokens.
 * Returns unit-normalized vectors, which is what our pgvector index
 * (`vector_cosine_ops`) expects.
 */
const MODEL_NAME = 'text-embedding-3-small';
// Hard ceiling per OpenAI docs; we keep well under it in practice.
const MAX_BATCH_SIZE = 96;

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private readonly client: OpenAI | null;

  constructor(private readonly aiUsageLogService: AiUsageLogService) {
    const apiKey = process.env.OPENAI_API_KEY;
    this.client = apiKey ? new OpenAI({ apiKey }) : null;
  }

  /** True when the environment is configured to actually call the API. */
  public isEnabled(): boolean {
    return this.client !== null;
  }

  public async embed(text: string): Promise<number[]> {
    const [vector] = await this.embedBatch([text]);
    return vector;
  }

  public async embedBatch(texts: string[]): Promise<number[][]> {
    if (!this.client) {
      throw new InternalServerErrorException(
        'OPENAI_API_KEY is not configured — cannot generate embeddings',
      );
    }
    if (texts.length === 0) return [];

    // Trim + collapse whitespace so we don't waste tokens on ragged input,
    // and drop empties (the API rejects those).
    const cleaned = texts.map((t) => t.replace(/\s+/g, ' ').trim());
    if (cleaned.some((t) => t.length === 0)) {
      throw new Error('embedBatch received an empty string');
    }

    const out: number[][] = [];
    for (let i = 0; i < cleaned.length; i += MAX_BATCH_SIZE) {
      const chunk = cleaned.slice(i, i + MAX_BATCH_SIZE);
      const res = await this.client.embeddings.create({
        model: MODEL_NAME,
        input: chunk,
      });

      // Fire-and-forget usage log so cost shows up on the admin dashboard.
      this.aiUsageLogService.log({
        userId: null,
        modelName: MODEL_NAME,
        inputTokens: res.usage?.prompt_tokens ?? 0,
        outputTokens: 0,
      });

      // OpenAI returns items in the same order as the input array.
      for (const item of res.data) {
        out.push(item.embedding);
      }
    }

    return out;
  }

  /**
   * Formats a JS number[] into the literal pgvector accepts in text
   * form, e.g. `[0.1,0.2,-0.3]`. Use with Prisma `$executeRawUnsafe` /
   * `$queryRawUnsafe` casting to `::vector` on the query side.
   */
  public static toVectorLiteral(vector: number[]): string {
    return `[${vector.join(',')}]`;
  }
}
