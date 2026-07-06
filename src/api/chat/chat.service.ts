import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ChatRequestDto, ChatResponseDto, SupportedModel } from './dto';
import {
  AnthropicProvider,
  ChatProvider,
  GeminiProvider,
  OpenAiProvider,
} from './providers';
import { AiUsageLogService } from '../ai-usage-log/ai-usage-log.service';

/** Hard ceiling on a single provider call before we give up on it. */
const PROVIDER_TIMEOUT_MS = 30_000;
/** One automatic retry on a transient failure before falling back. */
const MAX_ATTEMPTS = 2;

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private readonly registry: Map<SupportedModel, ChatProvider>;

  constructor(
    anthropic: AnthropicProvider,
    openai: OpenAiProvider,
    gemini: GeminiProvider,
    private readonly aiUsageLogService: AiUsageLogService,
  ) {
    this.registry = new Map<SupportedModel, ChatProvider>([
      [anthropic.key, anthropic],
      [openai.key, openai],
      [gemini.key, gemini],
    ]);
  }

  async send(req: ChatRequestDto): Promise<ChatResponseDto> {
    const primary = this.registry.get(req.model);
    if (!primary) {
      throw new BadRequestException(`Unsupported model: ${req.model}`);
    }

    // Try the requested provider (with one retry), then fall back to any
    // other configured provider. This keeps a single slow/broken provider
    // from taking down the whole chat experience.
    const fallbacks = [...this.registry.values()].filter((p) => p !== primary);
    const chain = [primary, ...fallbacks];

    let lastError: unknown;
    for (const provider of chain) {
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
          const res = await this.withTimeout(
            provider.send(req.messages, req.system, req.cachedSystem),
            PROVIDER_TIMEOUT_MS,
          );
          // Log usage fire-and-forget so the admin dashboard has data.
          // Uses the model that ACTUALLY served the request (may differ
          // from req.model if we fell back to a different provider).
          this.aiUsageLogService.log({
            userId: req.userId ?? null,
            modelName: res.model ?? req.model,
            inputTokens: res.usage?.inputTokens,
            outputTokens: res.usage?.outputTokens,
          });
          return res;
        } catch (err) {
          lastError = err;
          const label = `${provider.key} attempt ${attempt}/${MAX_ATTEMPTS}`;
          this.logger.warn(
            `Provider ${label} failed: ${err instanceof Error ? err.message : err}`,
          );
        }
      }
      if (provider !== chain[chain.length - 1]) {
        this.logger.warn(
          `Falling back from ${provider.key} to the next provider`,
        );
      }
    }

    this.logger.error(
      `All providers failed for model ${req.model}: ${
        lastError instanceof Error ? lastError.message : lastError
      }`,
    );
    throw lastError instanceof Error
      ? lastError
      : new Error('All chat providers failed');
  }

  /** Reject if the provider call doesn't settle within `ms`. */
  private withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error(`Provider call timed out after ${ms}ms`)),
        ms,
      );
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
