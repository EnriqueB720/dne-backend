import { UseGuards } from '@nestjs/common';
import { Args, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Throttle } from '@nestjs/throttler';

import { CurrentUser } from '../../shared/decorators';
import { JwtAuthGuard, OptionalJwtAuthGuard } from '../../shared/auth/guards';
import { IAuthUser } from '../../shared/auth/model';
import { ContactService } from './contact.service';
import { ContactLogInput } from './dto';
import { ReviewPrompt } from './model';

@Resolver()
export class ContactResolver {
  constructor(private readonly contactService: ContactService) {}

  /**
   * Log a customer → supplier contact. Guests are allowed (they count as a
   * lead); signed-in customers are recognised from the token. Throttled so a
   * script can't inflate a supplier's lead count.
   */
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @UseGuards(OptionalJwtAuthGuard)
  @Mutation(() => Boolean)
  public async logSupplierContact(
    @Args('data') data: ContactLogInput,
    @CurrentUser() user: IAuthUser | null,
  ): Promise<boolean> {
    return this.contactService.log(data, user ? Number(user.sub) : null);
  }

  /** Suppliers the signed-in customer contacted and could now review. */
  @UseGuards(JwtAuthGuard)
  @Query(() => [ReviewPrompt])
  public async reviewPrompts(@CurrentUser() user: IAuthUser): Promise<ReviewPrompt[]> {
    return this.contactService.pendingPrompts(Number(user.sub));
  }

  /** "Not now" on a review prompt. */
  @UseGuards(JwtAuthGuard)
  @Mutation(() => Boolean)
  public async dismissReviewPrompt(
    @Args('supplierId', { type: () => Int }) supplierId: number,
    @CurrentUser() user: IAuthUser,
  ): Promise<boolean> {
    return this.contactService.dismissPrompt(Number(user.sub), supplierId);
  }
}
