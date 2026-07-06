import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/datasource/prisma/prisma.service';
import { ChatService } from './chat.service';
import {
  CreateConversationDto,
  UpdateConversationDto,
  SendMessageDto,
  SupportedModel,
} from './dto';
import { ChatMessageDto } from './dto';

/**
 * Conversation-history context window, sized by an approximate TOKEN budget
 * rather than a fixed message count. A hard "last N messages" window is
 * fragile: 12 short messages might be 400 tokens, 12 long ones (pasted text,
 * fat provider-grounding blocks) could blow past the model's context limit —
 * or just waste money. We instead walk newest→oldest, summing an estimate,
 * and stop once the budget is spent.
 */
const CONTEXT_TOKEN_BUDGET = 3000;
/** Hard cap on rows pulled from the DB before the token walk. */
const MAX_CONTEXT_MESSAGES = 40;

/** Rough token estimate (~4 chars/token) — good enough for budgeting; no
 *  tokenizer dependency, and erring slightly high is safe. */
function estimateTokens(text: string): number {
  return Math.ceil((text?.length ?? 0) / 4);
}

/**
 * Identity of the caller. Either `userId` (authenticated) or `deviceId`
 * (guest) must be provided. When both are supplied, `userId` wins for
 * ownership checks and `deviceId` is recorded for telemetry.
 */
export interface CallerIdentity {
  userId?: number | null;
  deviceId?: string | null;
}

@Injectable()
export class ConversationService {
  private readonly logger = new Logger(ConversationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly chatService: ChatService,
  ) {}

  // ── Conversation CRUD ──────────────────────────────────────────────────

  async listConversations(caller: CallerIdentity) {
    const where = this.ownerWhere(caller);
    return this.prisma.aiConversation.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      select: {
        conversationId: true,
        title: true,
        model: true,
        userId: true,
        deviceId: true,
        createdAt: true,
        updatedAt: true,
        // Include messageId + conversationId so the GraphQL `AiMessage` type
        // (where both are non-nullable) can serialize without errors. The
        // sidebar only renders `content`/`createdAt` but the client query
        // still asks for messageId.
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            messageId: true,
            conversationId: true,
            content: true,
            role: true,
            createdAt: true,
          },
        },
      },
    });
  }

  async createConversation(
    dto: CreateConversationDto,
    caller: CallerIdentity,
  ) {
    const userId = caller.userId ?? null;
    // Persist a deviceId even for authenticated callers so guest→login
    // continuity (and legacy clients) keep working.
    const deviceId = caller.deviceId ?? dto.deviceId ?? '';

    if (!userId && !deviceId) {
      throw new BadRequestException(
        'Either an authenticated user or a deviceId is required',
      );
    }

    return this.prisma.aiConversation.create({
      data: {
        userId,
        deviceId,
        title: dto.title,
        model: dto.model,
      },
    });
  }

  async getConversation(conversationId: string, caller: CallerIdentity) {
    await this.assertOwnership(conversationId, caller);
    return this.prisma.aiConversation.findUnique({
      where: { conversationId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
  }

  async updateConversation(
    conversationId: string,
    caller: CallerIdentity,
    dto: UpdateConversationDto,
  ) {
    await this.assertOwnership(conversationId, caller);
    return this.prisma.aiConversation.update({
      where: { conversationId },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.model !== undefined && { model: dto.model }),
      },
    });
  }

  async deleteConversation(conversationId: string, caller: CallerIdentity) {
    await this.assertOwnership(conversationId, caller);
    await this.prisma.aiConversation.delete({ where: { conversationId } });
  }

  // ── Messaging ──────────────────────────────────────────────────────────

  async sendMessage(
    conversationId: string,
    caller: CallerIdentity,
    dto: SendMessageDto,
  ) {
    const conv = await this.assertOwnership(conversationId, caller);
    const modelToUse = (dto.model ?? conv.model) as SupportedModel;

    await this.prisma.aiMessage.create({
      data: {
        conversationId,
        role: 'user',
        content: dto.content,
      },
    });

    // Pull a bounded pool of recent messages, then keep as many of the
    // newest as fit inside the token budget. Always keep at least the most
    // recent message (the one we just saved) even if it alone is large.
    const recent = await this.prisma.aiMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: MAX_CONTEXT_MESSAGES,
      select: { role: true, content: true },
    });

    const windowed: typeof recent = [];
    let remaining = CONTEXT_TOKEN_BUDGET;
    for (const m of recent) {
      const cost = estimateTokens(m.content);
      if (windowed.length > 0 && cost > remaining) break;
      windowed.push(m);
      remaining -= cost;
    }

    // Reverse to chronological order — the model expects oldest-first.
    const contextMessages: ChatMessageDto[] = windowed
      .reverse()
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

    const aiResponse = await this.chatService.send({
      model: modelToUse,
      messages: contextMessages,
      system: dto.system,
      cachedSystem: dto.cachedSystem,
      // Attribute the AI usage row to the conversation's owner so the
      // admin dashboard can see per-user spend if needed.
      userId: conv.userId ?? undefined,
    });

    const saved = await this.prisma.aiMessage.create({
      data: {
        conversationId,
        role: 'assistant',
        content: aiResponse.content,
        model: aiResponse.model,
        inputTokens: aiResponse.usage?.inputTokens,
        outputTokens: aiResponse.usage?.outputTokens,
      },
    });

    await this.prisma.aiConversation.update({
      where: { conversationId },
      data: { updatedAt: new Date() },
    });

    return {
      messageId: saved.messageId,
      role: saved.role,
      content: saved.content,
      model: aiResponse.model,
      usage: aiResponse.usage,
      createdAt: saved.createdAt,
    };
  }

  async getMessages(conversationId: string, caller: CallerIdentity) {
    await this.assertOwnership(conversationId, caller);
    return this.prisma.aiMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async updateMessageProviders(
    conversationId: string,
    messageId: string,
    caller: CallerIdentity,
    providersJson: string,
  ) {
    await this.assertOwnership(conversationId, caller);
    return this.prisma.aiMessage.update({
      where: { messageId },
      data: { providersJson },
    });
  }

  /**
   * Link a conversation to the Request it produced (set on "Select"). This
   * connects the AI chat to the Request → Quote → Booking pipeline so the
   * originating conversation is reachable from the request and vice-versa.
   */
  async linkToRequest(
    conversationId: string,
    requestId: number,
    caller: CallerIdentity,
  ) {
    await this.assertOwnership(conversationId, caller);
    return this.prisma.aiConversation.update({
      where: { conversationId },
      data: { requestId },
    });
  }

  /**
   * Undo the most recent turn — used when the user hits "stop" mid-response.
   * Deletes the trailing assistant message (if the AI reply already landed
   * server-side) and the trailing user message, so an aborted turn leaves no
   * orphaned message behind. Never touches earlier, completed turns.
   *
   * Returns the number of messages deleted (0–2).
   */
  async rollbackLastTurn(conversationId: string, caller: CallerIdentity) {
    await this.assertOwnership(conversationId, caller);

    const recent = await this.prisma.aiMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: 2,
    });
    if (recent.length === 0) return 0;

    const idsToDelete: string[] = [];
    // If the assistant reply already persisted, drop it first...
    if (recent[0].role === 'assistant') {
      idsToDelete.push(recent[0].messageId);
      // ...and the user message that prompted it, if that's next.
      if (recent[1]?.role === 'user') {
        idsToDelete.push(recent[1].messageId);
      }
    } else if (recent[0].role === 'user') {
      // Aborted before the reply landed — just the lone user message.
      idsToDelete.push(recent[0].messageId);
    }

    if (idsToDelete.length === 0) return 0;
    await this.prisma.aiMessage.deleteMany({
      where: { messageId: { in: idsToDelete } },
    });
    return idsToDelete.length;
  }

  /**
   * Claim any guest conversations (userId IS NULL) for the given deviceId
   * and link them to `userId`. Called right after login so chats created
   * before authentication follow the user into their account.
   *
   * Returns the number of conversations claimed.
   */
  async mergeGuestConversations(userId: number, deviceId: string) {
    if (!userId || !deviceId) return 0;
    const result = await this.prisma.aiConversation.updateMany({
      where: { deviceId, userId: null },
      data: { userId },
    });
    return result.count;
  }

  // ── Private helpers ────────────────────────────────────────────────────

  /**
   * Build the where-clause for owner lookup. Authenticated users are scoped
   * by userId; guests by deviceId. This means a logged-in user sees their
   * AI history across browsers/devices, while guests stay tied to a single
   * device.
   */
  private ownerWhere(caller: CallerIdentity) {
    if (caller.userId != null) return { userId: caller.userId };
    if (caller.deviceId) return { deviceId: caller.deviceId, userId: null };
    throw new BadRequestException(
      'Either an authenticated user or a deviceId is required',
    );
  }

  private async assertOwnership(
    conversationId: string,
    caller: CallerIdentity,
  ) {
    const conv = await this.prisma.aiConversation.findUnique({
      where: { conversationId },
    });
    if (!conv) throw new NotFoundException('Conversation not found');

    if (caller.userId != null) {
      if (conv.userId !== caller.userId) {
        throw new ForbiddenException('Access denied');
      }
    } else if (caller.deviceId) {
      if (conv.deviceId !== caller.deviceId || conv.userId != null) {
        throw new ForbiddenException('Access denied');
      }
    } else {
      throw new ForbiddenException('Access denied');
    }

    return conv;
  }
}
