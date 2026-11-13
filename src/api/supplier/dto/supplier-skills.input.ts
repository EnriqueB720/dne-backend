import { Field, InputType, Int } from '@nestjs/graphql';

/**
 * Replaces a supplier's whole skill list in one call — the settings page
 * always submits the complete list, so anything omitted is removed.
 * Entries are normalized server-side (lowercased, trimmed, deduped).
 */
@InputType()
export class SupplierSkillsInput {
  @Field(() => Int)
  supplierId: number;

  @Field(() => [String])
  skills: string[];
}
