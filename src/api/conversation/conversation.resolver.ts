import { Inject } from '@nestjs/common';
import { Args, Int, Mutation, Query, Resolver, Subscription } from '@nestjs/graphql';
import { PubSub } from 'graphql-subscriptions';
import { GraphQLFields, IGraphQLFields } from '@decorators';

import { PUB_SUB } from 'src/shared/pubsub/pubsub.module';
import { ConversationService, MESSAGE_EVENT_CHANNEL } from './conversation.service';
import {
  Conversation,
  ConversationSelect,
  Message,
  MessageEvent,
  MessageSelect,
} from './model';
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

@Resolver(() => Conversation)
export class ConversationResolver {
  constructor(
    private readonly conversationService: ConversationService,
    @Inject(PUB_SUB) private readonly pubSub: PubSub,
  ) {}

  @Query(() => Conversation)
  public async conversation(
    @Args() args: ConversationArgs,
    @GraphQLFields() { fields }: IGraphQLFields<ConversationSelect>,
  ): Promise<Conversation> {
    return await this.conversationService.findOne(args, fields);
  }

  @Query(() => [Conversation])
  public async conversationsByCustomer(
    @Args() args: ConversationsByCustomerArgs,
    @GraphQLFields() { fields }: IGraphQLFields<ConversationSelect>,
  ): Promise<Conversation[]> {
    return await this.conversationService.findManyByCustomer(args, fields);
  }

  @Query(() => [Conversation])
  public async conversationsBySupplier(
    @Args() args: ConversationsBySupplierArgs,
    @GraphQLFields() { fields }: IGraphQLFields<ConversationSelect>,
  ): Promise<Conversation[]> {
    return await this.conversationService.findManyBySupplier(args, fields);
  }

  @Query(() => [Message])
  public async messagesByConversation(
    @Args() args: MessagesByConversationArgs,
    @GraphQLFields() { fields }: IGraphQLFields<MessageSelect>,
  ): Promise<Message[]> {
    return await this.conversationService.findMessages(args, fields);
  }

  @Mutation(() => Conversation)
  public async createConversation(
    @Args('data') data: ConversationCreateInput,
    @GraphQLFields() { fields }: IGraphQLFields<ConversationSelect>,
  ): Promise<Conversation> {
    return await this.conversationService.createConversation(data, fields);
  }

  @Mutation(() => Message)
  public async sendMessage(
    @Args('data') data: MessageSendInput,
    @GraphQLFields() { fields }: IGraphQLFields<MessageSelect>,
  ): Promise<Message> {
    return await this.conversationService.sendMessage(data, fields);
  }

  /** Returns the number of messages flipped to read. */
  @Mutation(() => Number)
  public async markMessagesAsRead(
    @Args('data') data: MarkMessagesReadInput,
  ): Promise<number> {
    return await this.conversationService.markMessagesAsRead(data);
  }

  @Mutation(() => Conversation)
  public async archiveConversation(
    @Args('data') data: ConversationArchiveInput,
    @GraphQLFields() { fields }: IGraphQLFields<ConversationSelect>,
  ): Promise<Conversation> {
    return await this.conversationService.archive(data, fields);
  }

  @Mutation(() => Conversation)
  public async restoreConversation(
    @Args('data') data: ConversationRestoreInput,
    @GraphQLFields() { fields }: IGraphQLFields<ConversationSelect>,
  ): Promise<Conversation> {
    return await this.conversationService.restore(data, fields);
  }

  // ── Subscriptions ───────────────────────────────────────────────────

  /**
   * Live message events for a specific conversation. Subscribers should call
   * refetch on the conversation's messages query when an event arrives.
   * Scoped by conversationId so each subscriber only sees their open thread.
   */
  @Subscription(() => MessageEvent, {
    name: 'messageEventForConversation',
    filter: (payload, variables) =>
      payload.conversationId === variables.conversationId,
    resolve: (payload) => payload.messageEvent,
  })
  public messageEventForConversation(
    @Args('conversationId', { type: () => Int }) _conversationId: number,
  ) {
    return this.pubSub.asyncIterableIterator(MESSAGE_EVENT_CHANNEL);
  }
}
