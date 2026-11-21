import { HttpException, HttpStatus, UseGuards } from '@nestjs/common';
import { Args, Context, Field, Float, InputType, Mutation, ObjectType, Resolver } from '@nestjs/graphql';
import { Throttle } from '@nestjs/throttler';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import type { Response } from 'express';

import { CurrentUser } from '../../shared/decorators';
import { OptionalJwtAuthGuard } from '../../shared/auth/guards';
import { IAuthUser } from '../../shared/auth/model';
import { ChatTurnService } from './chat-turn.service';

@InputType()
export class ChatTurnInput {
  /** Omit to start a new conversation. */
  @IsOptional()
  @IsString()
  @Field({ nullable: true })
  conversationId?: string;

  @MinLength(1)
  @MaxLength(2000)
  @Field()
  message: string;

  /** Guest owner key (the browser's solvo:device-id). */
  @IsOptional()
  @MaxLength(128)
  @Field({ nullable: true })
  deviceId?: string;

  /** Zone picked in the UI (ISO 3166-2, e.g. "CR-H"). */
  @IsOptional()
  @MaxLength(10)
  @Field({ nullable: true })
  province?: string;

  @Field(() => Float, { nullable: true })
  lat?: number;

  @Field(() => Float, { nullable: true })
  lng?: number;
}

@ObjectType()
export class ChatTurnReplyModel {
  @Field() messageId: string;
  @Field() content: string;
  /** Which AI answered: 'claude-haiku' or 'gemini-flash' (fallback). */
  @Field() model: string;
  @Field() createdAt: Date;
  /** JSON array of the supplier cards shown under this reply (null = none). */
  @Field({ nullable: true }) providersJson?: string;
  /** What was searched ("fontanero"). */
  @Field({ nullable: true }) service?: string;
  /** Province searched, null = nationwide. */
  @Field({ nullable: true }) zoneName?: string;
}

@ObjectType()
export class ChatTurnResult {
  @Field() conversationId: string;
  @Field() title: string;
  @Field(() => [ChatTurnReplyModel]) replies: ChatTurnReplyModel[];
}

/**
 * The whole AI chat in one mutation. The client sends the message and where
 * the user is; prompts, model choice, search and persistence stay here.
 */
@Resolver()
export class ChatTurnResolver {
  constructor(private readonly turns: ChatTurnService) {}

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @UseGuards(OptionalJwtAuthGuard)
  @Mutation(() => ChatTurnResult)
  async chatTurn(
    @Args('data') data: ChatTurnInput,
    @CurrentUser() user: IAuthUser | null,
    @Context() ctx: { res?: Response },
  ): Promise<ChatTurnResult> {
    let aborted = false;
    ctx.res?.on('close', () => {
      if (!ctx.res?.writableFinished) aborted = true;
    });

    const result = await this.turns.run(
      data,
      { userId: user?.sub != null ? Number(user.sub) : null, deviceId: data.deviceId ?? null },
      () => aborted,
    );
    // Client already gone — nothing was saved; the status is never read.
    if (!result) throw new HttpException('Client closed request', 499 as HttpStatus);
    return result as ChatTurnResult;
  }
}
