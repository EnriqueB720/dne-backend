import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { PrismaService } from '@prisma-datasource';
import { NotificationService } from '../notification/notification.service';
import { REVIEW_PROMPT_MAX_AGE_MS, reviewPromptDelayMs } from './contact.service';

/** Sent once per customer + supplier after they made contact. */
const TEMPLATE_CONTACT_REVIEW_PROMPT = 'CONTACT_REVIEW_PROMPT';

/**
 * Hourly sweep that follows up on contacts: once a customer reached out to a
 * supplier long enough ago and still hasn't reviewed them, ask "How did it
 * go?" in the bell. The notification links to the supplier's storefront,
 * where the review button is. Sent at most once per customer + supplier
 * (deduped against the notification table, like BookingNudgeService).
 */
@Injectable()
export class ContactNudgeService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ContactNudgeService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  /** Run once on boot so prompts don't wait up to an hour after a deploy. */
  public onApplicationBootstrap(): void {
    void this.sweep().catch((err) =>
      this.logger.warn(`Initial contact nudge sweep failed: ${err?.message ?? err}`),
    );
  }

  @Cron(CronExpression.EVERY_HOUR)
  public async sweep(): Promise<void> {
    const now = Date.now();
    const events = await this.prismaService.contactEvent.findMany({
      where: {
        customerId: { not: null },
        reviewPromptDismissedAt: null,
        createdAt: {
          lte: new Date(now - reviewPromptDelayMs()),
          gte: new Date(now - REVIEW_PROMPT_MAX_AGE_MS),
        },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        customerId: true,
        supplierId: true,
        supplier: { select: { companyName: true, deletedAt: true } },
        customer: { select: { user: { select: { userId: true } } } },
      },
      take: 500,
    });

    const seen = new Set<string>();
    for (const e of events) {
      if (e.customerId == null || !e.customer || e.supplier.deletedAt) continue;
      const key = `${e.customerId}:${e.supplierId}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const reviewed = await this.prismaService.review.findFirst({
        where: { customerId: e.customerId, supplierId: e.supplierId },
        select: { reviewId: true },
      });
      if (reviewed) continue;

      const userId = e.customer.user.userId;
      const alreadySent = await this.prismaService.notification.findFirst({
        where: {
          userId,
          template: TEMPLATE_CONTACT_REVIEW_PROMPT,
          entityType: 'Supplier',
          entityId: e.supplierId,
        },
        select: { notificationId: true },
      });
      if (alreadySent) continue;

      await this.notificationService.emit({
        userId,
        template: TEMPLATE_CONTACT_REVIEW_PROMPT,
        subject: 'How did it go?',
        body: `You reached out to ${e.supplier.companyName} recently. A quick rating helps them — and the next customer ⭐`,
        entityType: 'Supplier',
        entityId: e.supplierId,
      });
    }
  }
}
