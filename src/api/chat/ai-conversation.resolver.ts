import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { ConversationService, CallerIdentity } from './conversation.service';
import {
  AiConversationArgs,
  AiConversationCreateInput,
  AiConversationUpdateInput,
  AiMessageProvidersUpdateInput,
  AiMessageSendInput,
} from './dto';
import { AiConversation, AiMessage, SendAiMessageResult } from './model';
import { CurrentUser } from '../../shared/decorators';
import { OptionalJwtAuthGuard } from '../../shared/auth/guards';
import { IAuthUser } from '../../shared/auth/model';

/**
 * GraphQL surface for AI chats. Auth is optional — when a JWT is present
 * the conversation is bound to that user; otherwise we fall back to the
 * caller's deviceId. The new flow (logged-in user) is the supported path;
 * deviceId is preserved for backwards compatibility with existing guest
 * conversations.
 */
@Resolver(() => AiConversation)
@UseGuards(OptionalJwtAuthGuard)
export class AiConversationResolver {
  constructor(private readonly convService: ConversationService) {}

  private caller(
    user: IAuthUser | null,
    deviceId?: string | null,
  ): CallerIdentity {
    return {
      userId: user?.sub != null ? Number(user.sub) : null,
      deviceId: deviceId ?? null,
    };
  }

  // ── Queries ────────────────────────────────────────────────────────────

  @Query(() => [AiConversation])
  aiConversations(
    @CurrentUser() user: IAuthUser | null,
    @Args('deviceId', { nullable: true }) deviceId?: string,
  ): Promise<AiConversation[]> {
    return this.convService.listConversations(
      this.caller(user, deviceId),
    ) as unknown as Promise<AiConversation[]>;
  }

  @Query(() => AiConversation)
  aiConversation(
    @Args() { conversationId }: AiConversationArgs,
    @CurrentUser() user: IAuthUser | null,
    @Args('deviceId', { nullable: true }) deviceId?: string,
  ): Promise<AiConversation> {
    return this.convService.getConversation(
      conversationId,
      this.caller(user, deviceId),
    ) as unknown as Promise<AiConversation>;
  }

  @Query(() => [AiMessage])
  aiMessages(
    @Args() { conversationId }: AiConversationArgs,
    @CurrentUser() user: IAuthUser | null,
    @Args('deviceId', { nullable: true }) deviceId?: string,
  ): Promise<AiMessage[]> {
    return this.convService.getMessages(
      conversationId,
      this.caller(user, deviceId),
    ) as unknown as Promise<AiMessage[]>;
  }

  // ── Mutations ──────────────────────────────────────────────────────────

  @Mutation(() => AiConversation)
  createAiConversation(
    @Args('data') data: AiConversationCreateInput,
    @CurrentUser() user: IAuthUser | null,
  ): Promise<AiConversation> {
    return this.convService.createConversation(
      data,
      this.caller(user, data.deviceId),
    ) as unknown as Promise<AiConversation>;
  }

  @Mutation(() => AiConversation)
  updateAiConversation(
    @Args('data') data: AiConversationUpdateInput,
    @CurrentUser() user: IAuthUser | null,
    @Args('deviceId', { nullable: true }) deviceId?: string,
  ): Promise<AiConversation> {
    const { conversationId, ...patch } = data;
    return this.convService.updateConversation(
      conversationId,
      this.caller(user, deviceId),
      patch,
    ) as unknown as Promise<AiConversation>;
  }

  @Mutation(() => Boolean)
  async deleteAiConversation(
    @Args() { conversationId }: AiConversationArgs,
    @CurrentUser() user: IAuthUser | null,
    @Args('deviceId', { nullable: true }) deviceId?: string,
  ): Promise<boolean> {
    await this.convService.deleteConversation(
      conversationId,
      this.caller(user, deviceId),
    );
    return true;
  }

  @Mutation(() => SendAiMessageResult)
  sendAiMessage(
    @Args('data') data: AiMessageSendInput,
    @CurrentUser() user: IAuthUser | null,
    @Args('deviceId', { nullable: true }) deviceId?: string,
  ): Promise<SendAiMessageResult> {
    const { conversationId, ...payload } = data;
    return this.convService.sendMessage(
      conversationId,
      this.caller(user, deviceId),
      payload,
    ) as unknown as Promise<SendAiMessageResult>;
  }

  @Mutation(() => AiMessage)
  updateAiMessageProviders(
    @Args('data') data: AiMessageProvidersUpdateInput,
    @CurrentUser() user: IAuthUser | null,
    @Args('deviceId', { nullable: true }) deviceId?: string,
  ): Promise<AiMessage> {
    return this.convService.updateMessageProviders(
      data.conversationId,
      data.messageId,
      this.caller(user, deviceId),
      data.providersJson,
    ) as unknown as Promise<AiMessage>;
  }

  /**
   * Link any guest (userId-null) conversations created on the given device
   * to the currently authenticated user. Returns the count claimed. Safe to
   * call as a no-op when there are no guest chats — never throws on zero.
   */
  @Mutation(() => Number)
  async mergeGuestAiConversations(
    @Args('deviceId') deviceId: string,
    @CurrentUser() user: IAuthUser | null,
  ): Promise<number> {
    if (!user?.sub) return 0;
    return this.convService.mergeGuestConversations(
      Number(user.sub),
      deviceId,
    );
  }
}
