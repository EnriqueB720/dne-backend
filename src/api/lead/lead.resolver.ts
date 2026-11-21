import { Args, Mutation, Resolver } from '@nestjs/graphql';

import { LeadService } from './lead.service';
import { LeadEventCreateInput } from './dto';
import { LeadEvent } from './model';

@Resolver()
export class LeadResolver {
  constructor(private readonly leadService: LeadService) {}

  /**
   * Public (no auth) — fired client-side the moment a customer reveals a
   * supplier's contact info, from the AI chat "Contact" action or a
   * storefront contact-link click. Fire-and-forget on the frontend, so a
   * failure here never blocks the customer from reaching the supplier.
   */
  @Mutation(() => LeadEvent)
  public async recordLeadEvent(@Args('data') data: LeadEventCreateInput): Promise<LeadEvent> {
    return await this.leadService.recordLead(data);
  }
}
