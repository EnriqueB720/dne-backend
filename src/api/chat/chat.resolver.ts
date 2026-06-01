import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { ChatService } from './chat.service';
import { AiCompletionInput } from './dto';
import { AiCompletionResult } from './model';

/**
 * GraphQL surface for raw, stateless model completions — the GraphQL
 * replacement for the legacy `POST /chat` REST endpoint. Used by the intent
 * parser and provider-generation flows that don't persist a conversation.
 */
@Resolver(() => AiCompletionResult)
export class ChatResolver {
  constructor(private readonly chatService: ChatService) {}

  @Mutation(() => AiCompletionResult)
  async aiComplete(
    @Args('data') data: AiCompletionInput,
  ): Promise<AiCompletionResult> {
    const res = await this.chatService.send({
      model: data.model,
      messages: data.messages,
      system: data.system,
      cachedSystem: data.cachedSystem,
    });
    return {
      content: res.content,
      model: res.model,
      usage: res.usage,
    };
  }
}
