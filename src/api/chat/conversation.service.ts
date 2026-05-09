import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
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

@Injectable()
export class ConversationService {
  private readonly logger = new Logger(ConversationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly chatService: ChatService,
  ) {}

  // ── Conversation CRUD ──────────────────────────────────────────────────

  async listConversations(deviceId: string) {
    return this.prisma.conversation.findMany({
      where: { deviceId },
      orderBy: { updatedAt: 'desc' },
      select: {
        conversationId: true,
        title: true,
        model: true,
        createdAt: true,
        updatedAt: true,
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { content: true, role: true, createdAt: true },
        },
      },
    });
  }

  async createConversation(dto: CreateConversationDto) {
    return this.prisma.conversation.create({
      data: {
        deviceId: dto.deviceId,
        title: dto.title,
        model: dto.model,
      },
    });
  }

  async getConversation(conversationId: string, deviceId: string) {
    const conv = await this.prisma.conversation.findUnique({
      where: { conversationId },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!conv) throw new NotFoundException('Conversation not found');
    if (conv.deviceId !== deviceId)
      throw new ForbiddenException('Access denied');
    return conv;
  }

  async updateConversation(
    conversationId: string,
    deviceId: string,
    dto: UpdateConversationDto,
  ) {
    await this.assertOwnership(conversationId, deviceId);
    return this.prisma.conversation.update({
      where: { conversationId },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.model !== undefined && { model: dto.model }),
      },
    });
  }

  async deleteConversation(conversationId: string, deviceId: string) {
    await this.assertOwnership(conversationId, deviceId);
    await this.prisma.conversation.delete({ where: { conversationId } });
  }

  // ── Messaging ──────────────────────────────────────────────────────────

  async sendMessage(
    conversationId: string,
    deviceId: string,
    dto: SendMessageDto,
  ) {
    const conv = await this.assertOwnership(conversationId, deviceId);
    const modelToUse = (dto.model ?? conv.model) as SupportedModel;

    // Persist the user's message
    await this.prisma.message.create({
      data: {
        conversationId,
        role: 'user',
        content: dto.content,
      },
    });

    // Sliding window: fetch last CONTEXT_WINDOW messages (now includes the one we just saved)
    const history = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: CONTEXT_WINDOW,
      select: { role: true, content: true },
    });
    // Reverse so oldest is first (AI expects chronological order)
    const contextMessages: ChatMessageDto[] = history.reverse().map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    // Call the AI
    const aiResponse = await this.chatService.send({
      model: modelToUse,
      messages: contextMessages,
      system: dto.system,
    });

    // Persist the AI's reply
    const saved = await this.prisma.message.create({
      data: {
        conversationId,
        role: 'assistant',
        content: aiResponse.content,
        model: aiResponse.model,
        inputTokens: aiResponse.usage?.inputTokens,
        outputTokens: aiResponse.usage?.outputTokens,
      },
    });

    // Bump conversation.updatedAt so list stays sorted
    await this.prisma.conversation.update({
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

  async getMessages(conversationId: string, deviceId: string) {
    await this.assertOwnership(conversationId, deviceId);
    return this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async updateMessageProviders(
    conversationId: string,
    messageId: string,
    deviceId: string,
    providersJson: string,
  ) {
    await this.assertOwnership(conversationId, deviceId);
    return this.prisma.message.update({
      where: { messageId },
      data: { providersJson },
    });
  }

  // ── Private helpers ────────────────────────────────────────────────────

  private async assertOwnership(conversationId: string, deviceId: string) {
    const conv = await this.prisma.conversation.findUnique({
      where: { conversationId },
    });
    if (!conv) throw new NotFoundException('Conversation not found');
    if (conv.deviceId !== deviceId)
      throw new ForbiddenException('Access denied');
    return conv;
  }
}
