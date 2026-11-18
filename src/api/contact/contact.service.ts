import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '@prisma-datasource';
import { ContactLogInput } from './dto';
import { ReviewPrompt } from './model';

/** Repeat clicks on the same supplier inside this window are one contact. */
const CONTACT_DEDUPE_MS = 24 * 60 * 60 * 1000;

/**
 * How long after contacting a supplier we ask "How did it go?". Long enough
 * for the job to have happened; tune per environment (set it to 0 locally to
 * see prompts straight away).
 */
export function reviewPromptDelayMs(): number {
  const hours = Number(process.env.REVIEW_PROMPT_DELAY_HOURS ?? 48);
  return (Number.isFinite(hours) && hours >= 0 ? hours : 48) * 60 * 60 * 1000;
}

/** Contacts older than this are never prompted — the moment has passed. */
export const REVIEW_PROMPT_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

@Injectable()
export class ContactService {
  constructor(private readonly prismaService: PrismaService) {}

  /** Customer profile for a signed-in user, or null (guest / supplier-only). */
  private async customerIdFor(userId: number | null): Promise<number | null> {
    if (userId == null) return null;
    const customer = await this.prismaService.customer.findUnique({
      where: { userId },
      select: { customerId: true },
    });
    return customer?.customerId ?? null;
  }

  /**
   * Record that someone reached out to a supplier. Best-effort from the
   * client's point of view — it never blocks the call or the email opening.
   */
  public async log(data: ContactLogInput, userId: number | null): Promise<boolean> {
    const supplier = await this.prismaService.supplier.findFirst({
      where: { supplierId: data.supplierId, deletedAt: null },
      select: { userId: true },
    });
    if (!supplier) {
      throw new NotFoundException(`Supplier ${data.supplierId} not found`);
    }
    // A supplier opening their own contact links isn't a lead.
    if (userId != null && supplier.userId === userId) return false;

    const customerId = await this.customerIdFor(userId);
    const deviceId = customerId == null ? data.deviceId?.slice(0, 100) : undefined;

    if (customerId != null || deviceId) {
      const recent = await this.prismaService.contactEvent.findFirst({
        where: {
          supplierId: data.supplierId,
          ...(customerId != null ? { customerId } : { deviceId }),
          createdAt: { gte: new Date(Date.now() - CONTACT_DEDUPE_MS) },
        },
        select: { contactEventId: true },
      });
      if (recent) return true;
    }

    await this.prismaService.contactEvent.create({
      data: {
        supplierId: data.supplierId,
        customerId,
        deviceId,
        channel: data.channel,
        source: data.source?.slice(0, 20),
      },
    });
    return true;
  }

  /**
   * Suppliers the customer contacted a while ago, hasn't reviewed and hasn't
   * waved off — newest contact first.
   */
  public async pendingPrompts(userId: number): Promise<ReviewPrompt[]> {
    const customerId = await this.customerIdFor(userId);
    if (customerId == null) return [];

    const now = Date.now();
    const events = await this.prismaService.contactEvent.findMany({
      where: {
        customerId,
        reviewPromptDismissedAt: null,
        createdAt: {
          lte: new Date(now - reviewPromptDelayMs()),
          gte: new Date(now - REVIEW_PROMPT_MAX_AGE_MS),
        },
        supplier: {
          deletedAt: null,
          reviewsReceived: { none: { customerId } },
        },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        supplierId: true,
        createdAt: true,
        supplier: { select: { companyName: true, city: true } },
      },
      take: 100,
    });

    // Newest-first, so the first row per supplier is its latest contact.
    const bySupplier = new Map<number, ReviewPrompt>();
    for (const e of events) {
      if (bySupplier.has(e.supplierId)) continue;
      bySupplier.set(e.supplierId, {
        supplierId: e.supplierId,
        companyName: e.supplier.companyName,
        city: e.supplier.city ?? undefined,
        contactedAt: e.createdAt,
      });
    }
    return [...bySupplier.values()].slice(0, 10);
  }

  /** "Not now" — stop asking about this supplier until they're contacted again. */
  public async dismissPrompt(userId: number, supplierId: number): Promise<boolean> {
    const customerId = await this.customerIdFor(userId);
    if (customerId == null) return false;
    await this.prismaService.contactEvent.updateMany({
      where: { customerId, supplierId, reviewPromptDismissedAt: null },
      data: { reviewPromptDismissedAt: new Date() },
    });
    return true;
  }
}
