import { UseGuards } from '@nestjs/common';
import { Args, Int, Mutation, Query, Resolver } from '@nestjs/graphql';

import { CurrentUser } from '../../shared/decorators';
import { OptionalJwtAuthGuard } from '../../shared/auth/guards';
import { IAuthUser } from '../../shared/auth/model';
import { CallerIdentity, ConversationService } from './conversation.service';
import { AiConversationArgs } from './dto';
import { AiConversation, AiMessage } from './model';

/**
 * Read / delete persisted AI chats. Auth is optional: with a JWT the chats
 * are the user's, otherwise the caller's `deviceId`. New turns are created
 * by `chatTurn` (assistant module), never written from the client.
 */
@Resolver(() => AiConversation)
@UseGuards(OptionalJwtAuthGuard)
export class AiConversationResolver {
  constructor(private readonly convService: ConversationService) {}

  private caller(user: IAuthUser | null, deviceId?: string | null): CallerIdentity {
    return { userId: user?.sub != null ? Number(user.sub) : null, deviceId: deviceId ?? null };
  }

  @Query(() => [AiConversation])
  aiConversations(
    @CurrentUser() user: IAuthUser | null,
    @Args('deviceId', { nullable: true }) deviceId?: string,
  ): Promise<AiConversation[]> {
    return this.convService.listConversations(this.caller(user, deviceId)) as unknown as Promise<AiConversation[]>;
  }

  @Query(() => AiConversation)
  aiConversation(
    @Args() { conversationId }: AiConversationArgs,
    @CurrentUser() user: IAuthUser | null,
    @Args('deviceId', { nullable: true }) deviceId?: string,
  ): Promise<AiConversation> {
    return this.convService.getConversation(conversationId, this.caller(user, deviceId)) as unknown as Promise<AiConversation>;
  }

  @Query(() => [AiMessage])
  aiMessages(
    @Args() { conversationId }: AiConversationArgs,
    @CurrentUser() user: IAuthUser | null,
    @Args('deviceId', { nullable: true }) deviceId?: string,
  ): Promise<AiMessage[]> {
    return this.convService.getMessages(conversationId, this.caller(user, deviceId)) as unknown as Promise<AiMessage[]>;
  }

  @Mutation(() => Boolean)
  async deleteAiConversation(
    @Args() { conversationId }: AiConversationArgs,
    @CurrentUser() user: IAuthUser | null,
    @Args('deviceId', { nullable: true }) deviceId?: string,
  ): Promise<boolean> {
    await this.convService.deleteConversation(conversationId, this.caller(user, deviceId));
    return true;
  }

  /** After sign-in: move this device's guest chats to the account. */
  @Mutation(() => Int)
  async mergeGuestAiConversations(
    @Args('deviceId') deviceId: string,
    @CurrentUser() user: IAuthUser | null,
  ): Promise<number> {
    if (!user?.sub) return 0;
    return this.convService.mergeGuestConversations(Number(user.sub), deviceId);
  }
}
