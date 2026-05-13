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

/** Number of most recent messages sent to the AI as context (sliding window). */
const CONTEXT_WINDOW = 12;

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

    const history = await this.prisma.aiMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: CONTEXT_WINDOW,
      select: { role: true, content: true },
    });
    const contextMessages: ChatMessageDto[] = history.reverse().map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    const aiResponse = await this.chatService.send({
      model: modelToUse,
      messages: contextMessages,
      system: dto.system,
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
