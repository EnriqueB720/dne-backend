import { Injectable } from '@nestjs/common';

import { PrismaService } from '@prisma-datasource';
import {
  FavoriteToggleInput,
  FavoritesByCustomerArgs,
} from './dto';
import { Favorite, FavoriteSelect } from './model';

/**
 * Result of a toggle — `wasAdded` lets the frontend show the right toast
 * ("Saved" vs "Removed") without an extra query.
 */
export interface FavoriteToggleResult {
  favoriteId: number | null;
  customerId: number;
  supplierId: number;
  wasAdded: boolean;
}

@Injectable()
export class FavoriteService {
  constructor(private readonly prismaService: PrismaService) {}

  public async findManyByCustomer(
    { customerId }: FavoritesByCustomerArgs,
    { select }: FavoriteSelect,
  ): Promise<Favorite[]> {
    return await this.prismaService.favorite.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      select,
    });
  }

  /** Add the supplier to the customer's saved list, or remove if already saved. */
  public async toggle({
    customerId,
    supplierId,
    notes,
  }: FavoriteToggleInput): Promise<FavoriteToggleResult> {
    const existing = await this.prismaService.favorite.findUnique({
      where: { customerId_supplierId: { customerId, supplierId } },
      select: { favoriteId: true },
    });

    if (existing) {
      await this.prismaService.favorite.delete({
        where: { customerId_supplierId: { customerId, supplierId } },
      });
      return {
        favoriteId: null,
        customerId,
        supplierId,
        wasAdded: false,
      };
    }

    const created = await this.prismaService.favorite.create({
      data: { customerId, supplierId, notes },
      select: { favoriteId: true },
    });
    return {
      favoriteId: created.favoriteId,
      customerId,
      supplierId,
      wasAdded: true,
    };
  }
}
