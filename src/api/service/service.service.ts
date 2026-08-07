import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PricingModel, Prisma } from '@prisma/client';

import { PrismaService } from '@prisma-datasource';
import { SupplierService } from '../supplier/supplier.service';
import {
  ServiceCreateInput,
  ServiceDeleteInput,
  ServiceUpdateInput,
  ServicesBySupplierArgs,
} from './dto';
import { Service, ServiceSelect } from './model';

@Injectable()
export class ServiceService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly supplierService: SupplierService,
  ) {}

  /**
   * Parse a decimal-as-string coming off the wire. Returns `null` for blank
   * input so full-replace updates can clear an optional price.
   */
  private toDecimal(
    value: string | null | undefined,
    label: string,
  ): Prisma.Decimal | null {
    if (value == null || value.trim() === '') return null;
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) {
      throw new BadRequestException(`${label} must be a non-negative number`);
    }
    return new Prisma.Decimal(n);
  }

  /**
   * Shared validation for create + update. Keeps the two price/unit ranges
   * coherent so the storefront never renders "from ₡50k, up to ₡10k".
   */
  private assertCoherent(input: {
    name: string;
    description: string;
    basePrice: Prisma.Decimal | null;
    minTotalPrice: Prisma.Decimal | null;
    maxTotalPrice: Prisma.Decimal | null;
    minUnits?: number;
    maxUnits?: number;
  }): void {
    if (!input.name?.trim()) {
      throw new BadRequestException('Service name is required');
    }
    if (!input.description?.trim()) {
      throw new BadRequestException('Service description is required');
    }
    if (input.basePrice == null) {
      throw new BadRequestException('Base price is required');
    }
    if (
      input.minTotalPrice != null &&
      input.maxTotalPrice != null &&
      input.minTotalPrice.greaterThan(input.maxTotalPrice)
    ) {
      throw new BadRequestException(
        'Minimum total price cannot exceed maximum total price',
      );
    }
    if (
      input.minUnits != null &&
      input.maxUnits != null &&
      input.minUnits > input.maxUnits
    ) {
      throw new BadRequestException('Minimum units cannot exceed maximum units');
    }
  }

  /** Throws unless the service exists, is live, and belongs to `supplierId`. */
  private async assertOwned(
    serviceId: number,
    supplierId: number,
  ): Promise<void> {
    const existing = await this.prismaService.service.findUnique({
      where: { serviceId },
      select: { supplierId: true, deletedAt: true },
    });
    if (!existing || existing.deletedAt) {
      throw new NotFoundException('Service not found');
    }
    if (existing.supplierId !== supplierId) {
      throw new BadRequestException('Service does not belong to this supplier');
    }
  }

  public async findManyBySupplier(
    { supplierId, includeInactive }: ServicesBySupplierArgs,
    { select }: ServiceSelect,
  ): Promise<Service[]> {
    return (await this.prismaService.service.findMany({
      where: {
        supplierId,
        deletedAt: null,
        ...(includeInactive ? {} : { active: true }),
      },
      orderBy: [{ active: 'desc' }, { serviceId: 'asc' }],
      select,
    })) as unknown as Service[];
  }

  public async create(
    data: ServiceCreateInput,
    { select }: ServiceSelect,
  ): Promise<Service> {
    const { supplierId, categoryId, ...rest } = data;

    const basePrice = this.toDecimal(rest.basePrice, 'Base price');
    const minTotalPrice = this.toDecimal(rest.minTotalPrice, 'Minimum total price');
    const maxTotalPrice = this.toDecimal(rest.maxTotalPrice, 'Maximum total price');

    this.assertCoherent({
      name: rest.name,
      description: rest.description,
      basePrice,
      minTotalPrice,
      maxTotalPrice,
      minUnits: rest.minUnits,
      maxUnits: rest.maxUnits,
    });

    const created = (await this.prismaService.service.create({
      data: {
        supplierId,
        categoryId,
        name: rest.name.trim(),
        description: rest.description.trim(),
        pricingModel: rest.pricingModel ?? PricingModel.FLAT,
        basePrice,
        currency: rest.currency || 'CRC',
        minTotalPrice,
        maxTotalPrice,
        minUnits: rest.minUnits ?? null,
        maxUnits: rest.maxUnits ?? null,
        unitLabel: rest.unitLabel?.trim() || null,
        active: rest.active ?? true,
      },
      select,
    })) as unknown as Service;

    // Services feed the supplier's semantic-search vector — re-embed so a
    // brand-new offering is discoverable from the AI chat right away.
    this.supplierService.scheduleEmbed(supplierId);

    return created;
  }

  public async update(
    data: ServiceUpdateInput,
    { select }: ServiceSelect,
  ): Promise<Service> {
    const { serviceId, supplierId, categoryId, ...rest } = data;

    await this.assertOwned(serviceId, supplierId);

    const basePrice = this.toDecimal(rest.basePrice, 'Base price');
    const minTotalPrice = this.toDecimal(rest.minTotalPrice, 'Minimum total price');
    const maxTotalPrice = this.toDecimal(rest.maxTotalPrice, 'Maximum total price');

    this.assertCoherent({
      name: rest.name,
      description: rest.description,
      basePrice,
      minTotalPrice,
      maxTotalPrice,
      minUnits: rest.minUnits,
      maxUnits: rest.maxUnits,
    });

    const updated = (await this.prismaService.service.update({
      where: { serviceId },
      data: {
        categoryId,
        name: rest.name.trim(),
        description: rest.description.trim(),
        pricingModel: rest.pricingModel ?? PricingModel.FLAT,
        basePrice,
        currency: rest.currency || 'CRC',
        // Full-replace: `null` clears whatever was there before.
        minTotalPrice,
        maxTotalPrice,
        minUnits: rest.minUnits ?? null,
        maxUnits: rest.maxUnits ?? null,
        unitLabel: rest.unitLabel?.trim() || null,
        active: rest.active ?? true,
      },
      select,
    })) as unknown as Service;

    this.supplierService.scheduleEmbed(supplierId);

    return updated;
  }

  /**
   * Soft delete. Services are referenced by historical quote items, so the
   * row has to stay — `deletedAt` takes it off the storefront instead.
   */
  public async delete({
    serviceId,
    supplierId,
  }: ServiceDeleteInput): Promise<boolean> {
    await this.assertOwned(serviceId, supplierId);

    await this.prismaService.service.update({
      where: { serviceId },
      data: { deletedAt: new Date(), active: false },
    });

    this.supplierService.scheduleEmbed(supplierId);

    return true;
  }
}
