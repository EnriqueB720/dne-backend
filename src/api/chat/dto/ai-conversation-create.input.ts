import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, IsString, MaxLength } from 'class-validator';

@InputType()
export class AiConversationCreateInput {
  @Field()
  @IsString()
  @MaxLength(255)
  title: string;

  /**
   * Optional client-provided device id (used for guest / unauthenticated chats).
   * When the caller is authenticated, the resolver attaches the userId instead.
   */
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  deviceId?: string;
}
