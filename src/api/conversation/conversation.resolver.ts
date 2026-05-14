import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { GraphQLFields, IGraphQLFields } from '@decorators';

import { ConversationService } from './conversation.service';
import {
  Conversation,
  ConversationSelect,
  Message,
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
  constructor(private readonly conversationService: ConversationService) {}

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
}
