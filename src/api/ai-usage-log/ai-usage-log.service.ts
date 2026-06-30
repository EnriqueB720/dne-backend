import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '@prisma-datasource';

/**
 * Per-model USD pricing per 1M tokens. Used to compute a server-side cost
 * estimate for every AI usage log row so the admin dashboard has rough
 * spend numbers without needing to fetch from provider dashboards.
 *
 * Mirrors the per-model pricing the frontend constants used to expose for
 * the (now-removed) AI usage tab. Update when provider prices change.
 */
const MODEL_PRICING_PER_MILLION_TOKENS: Record<
  string,
  { input: number; output: number }
> = {
  'claude-haiku': { input: 0.8, output: 4 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  'gemini-flash': { input: 0.075, output: 0.3 },
};

function estimateCostUsd(
  modelName: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const p = MODEL_PRICING_PER_MILLION_TOKENS[modelName];
  if (!p) return 0;
  return (inputTokens / 1_000_000) * p.input + (outputTokens / 1_000_000) * p.output;
}

export interface AiUsageLogInput {
  userId?: number | null;
  modelName: string;
  inputTokens?: number | null;
  outputTokens?: number | null;
}

/**
 * Writes one row per AI completion. Fire-and-forget — never blocks the
 * caller, never throws into the chat path.
 */
@Injectable()
export class AiUsageLogService {
  private readonly logger = new Logger(AiUsageLogService.name);

  constructor(private readonly prismaService: PrismaService) {}

  public log(input: AiUsageLogInput): void {
    const inputTokens = Math.max(0, input.inputTokens ?? 0);
    const outputTokens = Math.max(0, input.outputTokens ?? 0);
    const costUsd = new Prisma.Decimal(
      estimateCostUsd(input.modelName, inputTokens, outputTokens),
    );

    void this.prismaService.aiUsageLog
      .create({
        data: {
          userId: input.userId ?? null,
          modelName: input.modelName,
          inputTokens,
          outputTokens,
          costUsd,
        },
      })
      .catch((err) => {
        this.logger.warn(
          `AiUsageLog write failed for model=${input.modelName}: ${
            (err as Error).message
          }`,
        );
      });
  }
}
