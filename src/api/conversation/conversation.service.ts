import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConversationStatus, MessageType, SenderType } from '@prisma/client';

import { PrismaService } from '@prisma-datasource';
import {
  ConversationArchiveInput,
  ConversationArgs,
  ConversationCreateInput,
  ConversationRestoreInput,
  ConversationsByCustomerArgs,
  ConversationsBySupplierArgs,
  MarkMessagesReadInput,
  MessageSendInput,
  MessagesByConversationArgs,
} from './dto';
import {
  Conversation,
  ConversationSelect,
  Message,
  MessageSelect,
} from './model';

// Anti-disintermediation: catch most casual sharing of phones/emails. Suppliers
// and customers should keep communication on-platform until a booking is confirmed.
const PHONE_RE = /(\+?\d[\d\s\-().]{7,}\d)/g;
const EMAIL_RE = /([\w.+-]+@[\w-]+\.[\w.-]+)/g;

function filterContact(content: string): {
  cleanContent: string;
  filtered: boolean;
  filteredReason: string | null;
} {
  const reasons: string[] = [];
  let cleanContent = content.replace(PHONE_RE, '[phone hidden]');
  if (cleanContent !== content) reasons.push('phone');
  const beforeEmail = cleanContent;
  cleanContent = cleanContent.replace(EMAIL_RE, '[email hidden]');
  if (cleanContent !== beforeEmail) reasons.push('email');

  return {
    cleanContent,
    filtered: reasons.length > 0,
    filteredReason: reasons.length > 0 ? `Filtered: ${reasons.join(', ')}` : null,
  };
}

@Injectable()
export class ConversationService {
  constructor(private readonly prismaService: PrismaService) {}

  // ── Queries ─────────────────────────────────────────────────────────

  public async findOne(
    { where }: ConversationArgs,
    { select }: ConversationSelect,
  ): Promise<Conversation> {
    return await this.prismaService.conversation.findFirst({
      where,
      select,
    });
  }

  /**
   * Build a per-user "active vs archived" filter using ConversationParticipantState.
   * No row OR archivedAt = null → active for that viewer.
   * Row with archivedAt set → archived for that viewer.
   */
  private viewerStateFilter(viewerUserId: number, status?: ConversationStatus) {
    if (status === ConversationStatus.ARCHIVED) {
      return {
        participantStates: {
          some: { userId: viewerUserId, archivedAt: { not: null } },
        },
      };
    }
    // ACTIVE (default) — also excludes globally BLOCKED
    return {
      status: { not: ConversationStatus.BLOCKED },
      participantStates: {
        none: { userId: viewerUserId, archivedAt: { not: null } },
      },
    };
  }

  public async findManyByCustomer(
    { customerId, viewerUserId, status }: ConversationsByCustomerArgs,
    { select }: ConversationSelect,
  ): Promise<Conversation[]> {
    return await this.prismaService.conversation.findMany({
      where: { customerId, ...this.viewerStateFilter(viewerUserId, status) },
      orderBy: [{ lastMessageAt: 'desc' }, { createdAt: 'desc' }],
      select,
    });
  }

  public async findManyBySupplier(
    { supplierId, viewerUserId, status }: ConversationsBySupplierArgs,
    { select }: ConversationSelect,
  ): Promise<Conversation[]> {
    return await this.prismaService.conversation.findMany({
      where: { supplierId, ...this.viewerStateFilter(viewerUserId, status) },
      orderBy: [{ lastMessageAt: 'desc' }, { createdAt: 'desc' }],
      select,
    });
  }

  public async findMessages(
    { conversationId, limit }: MessagesByConversationArgs,
    { select }: MessageSelect,
  ): Promise<Message[]> {
    return await this.prismaService.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: limit && limit > 0 ? limit : 100,
      select,
    });
  }

  // ── Mutations ───────────────────────────────────────────────────────

  /**
   * Find-or-create a conversation between the request's customer and the given supplier.
   * Idempotent — returns the existing row if one is already on file for this pair.
   */
  public async createConversation(
    { requestId, supplierId }: ConversationCreateInput,
    { select }: ConversationSelect,
  ): Promise<Conversation> {
    const request = await this.prismaService.request.findUnique({
      where: { requestId },
      select: { requestId: true, customerId: true },
    });
    if (!request) {
      throw new NotFoundException(`Request ${requestId} not found`);
    }

    const supplier = await this.prismaService.supplier.findUnique({
      where: { supplierId },
      select: { supplierId: true },
    });
    if (!supplier) {
      throw new NotFoundException(`Supplier ${supplierId} not found`);
    }

    const existing = await this.prismaService.conversation.findUnique({
      where: { requestId_supplierId: { requestId, supplierId } },
      select,
    });
    if (existing) return existing;

    return await this.prismaService.conversation.create({
      data: {
        requestId,
        supplierId,
        customerId: request.customerId,
        status: ConversationStatus.ACTIVE,
      },
      select,
    });
  }

  /**
   * Send a message in an existing conversation. Filters phone/email out of the
   * content before persisting (anti-disintermediation) and bumps the conversation's
   * lastMessageAt for inbox ordering.
   */
  public async sendMessage(
    { conversationId, senderUserId, content, messageType }: MessageSendInput,
    { select }: MessageSelect,
  ): Promise<Message> {
    if (!content || !content.trim()) {
      throw new BadRequestException('Message content cannot be empty');
    }

    const conversation = await this.prismaService.conversation.findUnique({
      where: { conversationId },
      select: {
        conversationId: true,
        status: true,
        customer: { select: { userId: true } },
        supplier: { select: { userId: true } },
      },
    });
    if (!conversation) {
      throw new NotFoundException(`Conversation ${conversationId} not found`);
    }
    if (conversation.status === ConversationStatus.BLOCKED) {
      throw new BadRequestException('This conversation is blocked');
    }

    // Determine the sender's role within this conversation
    let senderType: SenderType = SenderType.SYSTEM;
    if (conversation.customer.userId === senderUserId) senderType = SenderType.CUSTOMER;
    else if (conversation.supplier.userId === senderUserId) senderType = SenderType.SUPPLIER;

    const { cleanContent, filtered, filteredReason } = filterContact(content);

    return await this.prismaService.$transaction(async (tx) => {
      const message = await tx.message.create({
        data: {
          conversationId,
          senderType,
          senderUserId,
          content: cleanContent,
          messageType: messageType ?? MessageType.TEXT,
          filtered,
          filteredReason,
        },
        select,
      });

      await tx.conversation.update({
        where: { conversationId },
        data: {
          lastMessageAt: new Date(),
          ...(filtered && { contactShareWarnings: { increment: 1 } }),
        },
      });

      return message;
    });
  }

  /**
   * Mark every message sent by the OTHER participant (sender !== viewer) as read.
   * Returns the count of messages flipped.
   */
  public async markMessagesAsRead({
    conversationId,
    viewerUserId,
  }: MarkMessagesReadInput): Promise<number> {
    const result = await this.prismaService.message.updateMany({
      where: {
        conversationId,
        readAt: null,
        senderUserId: { not: viewerUserId },
      },
      data: { readAt: new Date() },
    });
    return result.count;
  }

  /**
   * Per-user archive — upserts a ConversationParticipantState row for this
   * user with archivedAt = now. The other party is unaffected.
   */
  public async archive(
    { conversationId, userId }: ConversationArchiveInput,
    { select }: ConversationSelect,
  ): Promise<Conversation> {
    const conversation = await this.prismaService.conversation.findUnique({
      where: { conversationId },
      select: {
        customer: { select: { userId: true } },
        supplier: { select: { userId: true } },
      },
    });
    if (!conversation) {
      throw new NotFoundException(`Conversation ${conversationId} not found`);
    }
    const isParticipant =
      conversation.customer.userId === userId ||
      conversation.supplier.userId === userId;
    if (!isParticipant) {
      throw new BadRequestException('Only conversation participants can archive it');
    }

    await this.prismaService.conversationParticipantState.upsert({
      where: { conversationId_userId: { conversationId, userId } },
      update: { archivedAt: new Date() },
      create: { conversationId, userId, archivedAt: new Date() },
    });

    return await this.prismaService.conversation.findUniqueOrThrow({
      where: { conversationId },
      select,
    });
  }

  /**
   * Per-user restore — clears the archivedAt for this user. Other party
   * is unaffected.
   */
  public async restore(
    { conversationId, userId }: ConversationRestoreInput,
    { select }: ConversationSelect,
  ): Promise<Conversation> {
    await this.prismaService.conversationParticipantState.updateMany({
      where: { conversationId, userId, archivedAt: { not: null } },
      data: { archivedAt: null },
    });
    return await this.prismaService.conversation.findUniqueOrThrow({
      where: { conversationId },
      select,
    });
  }
}
