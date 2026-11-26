import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';

import { AiUsageLogService } from '../ai-usage-log/ai-usage-log.service';
import { ChatRequestDto, ChatResponseDto } from './dto';
import { AnthropicProvider, ChatProvider, GeminiProvider } from './providers';

/** Hard ceiling on a single provider call before we give up on it. */
const PROVIDER_TIMEOUT_MS = 30_000;
/** One automatic retry on a transient failure before falling back. */
const MAX_ATTEMPTS = 2;

/**
 * Every AI call in the app goes through here. The order is fixed and the
 * client cannot change it: Claude first, Gemini (free tier) only when
 * Claude is unconfigured, down, slow, or declines.
 */
@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private readonly chain: ChatProvider[];

  constructor(
    anthropic: AnthropicProvider,
    gemini: GeminiProvider,
    private readonly aiUsageLogService: AiUsageLogService,
  ) {
    this.chain = [anthropic, gemini];
  }

  async send(req: ChatRequestDto): Promise<ChatResponseDto> {
    const providers = this.chain.filter((p) => p.isConfigured());
    if (providers.length === 0) {
      throw new ServiceUnavailableException('No AI provider is configured (set ANTHROPIC_API_KEY or GEMINI_API_KEY)');
    }

    let lastError: unknown;
    for (const provider of providers) {
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
          const res = await this.withTimeout(
            provider.send(req.messages, req.system, req.cachedSystem),
            PROVIDER_TIMEOUT_MS,
          );
          // Fire-and-forget; logs the model that actually answered.
          this.aiUsageLogService.log({
            userId: req.userId ?? null,
            modelName: res.model,
            inputTokens: res.usage?.inputTokens,
            outputTokens: res.usage?.outputTokens,
          });
          return res;
        } catch (err) {
          lastError = err;
          this.logger.warn(
            `${provider.key} attempt ${attempt}/${MAX_ATTEMPTS} failed: ${err instanceof Error ? err.message : err}`,
          );
        }
      }
      this.logger.warn(`Falling back from ${provider.key}`);
    }

    this.logger.error(`All AI providers failed: ${lastError instanceof Error ? lastError.message : lastError}`);
    throw new ServiceUnavailableException('The assistant is unavailable right now. Please try again.');
  }

  private withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Provider call timed out after ${ms}ms`)), ms);
      promise.then(
        (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        (err) => {
          clearTimeout(timer);
          reject(err);
        },
      );
    });
  }
}
