import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '@prisma-datasource';
import { SupplierService } from '../supplier/supplier.service';
import { ServiceInput } from './dto';
import { Service, ServiceSelect } from './model';

/** Hard cap so a profile stays scannable. */
const MAX_SERVICES_PER_SUPPLIER = 30;

@Injectable()
export class ServiceService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly supplierService: SupplierService,
  ) {}

  /** "15,000" / "₡15000" / "" → Decimal | null. */
  private toPrice(value?: string | null): Prisma.Decimal | null {
    if (value == null || value.trim() === '') return null;
    const n = Number(value.replace(/[^\d.]/g, ''));
    if (!Number.isFinite(n) || n < 0) throw new BadRequestException('Price must be a non-negative number');
    return new Prisma.Decimal(n);
  }

  /** Create or update one of the signed-in supplier's services. */
  public async save(userId: number, input: ServiceInput, { select }: ServiceSelect): Promise<Service> {
    const supplierId = await this.supplierService.supplierIdForUser(userId);
    const data = {
      name: input.name.trim(),
      description: input.description?.trim() || null,
      priceFrom: this.toPrice(input.priceFrom),
      priceUnit: input.priceUnit?.trim() || null,
      currency: (input.currency || 'CRC').toUpperCase(),
    };

    let saved: unknown;
    if (input.serviceId) {
      await this.assertOwned(input.serviceId, supplierId);
      saved = await this.prismaService.service.update({ where: { serviceId: input.serviceId }, data, select });
    } else {
      const count = await this.prismaService.service.count({ where: { supplierId } });
      if (count >= MAX_SERVICES_PER_SUPPLIER) {
        throw new BadRequestException(`A profile can list up to ${MAX_SERVICES_PER_SUPPLIER} services`);
      }
      saved = await this.prismaService.service.create({ data: { ...data, supplierId }, select });
    }

    this.supplierService.scheduleEmbed(supplierId);
    return saved as Service;
  }

  public async remove(userId: number, serviceId: number): Promise<boolean> {
    const supplierId = await this.supplierService.supplierIdForUser(userId);
    await this.assertOwned(serviceId, supplierId);
    await this.prismaService.service.delete({ where: { serviceId } });
    this.supplierService.scheduleEmbed(supplierId);
    return true;
  }

  private async assertOwned(serviceId: number, supplierId: number): Promise<void> {
    const existing = await this.prismaService.service.findUnique({
      where: { serviceId },
      select: { supplierId: true },
    });
    if (!existing || existing.supplierId !== supplierId) throw new NotFoundException('Service not found');
  }
}
