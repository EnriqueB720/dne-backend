import { Prisma } from '@prisma/client';

import { GeoService } from '../../shared/geo';
import { SupplierService } from '../supplier/supplier.service';

/**
 * The compact supplier the chat shows as a card. Stored as JSON in
 * `ai_message.providers_json` and parsed by the frontend
 * (`dne-frontend/src/shared/lib/supplier.ts` → ChatSupplier). Keep both
 * shapes in sync.
 */
export interface ChatSupplier {
  supplierId: number;
  companyName: string;
  tagline?: string | null;
  city?: string | null;
  provinceName?: string | null;
  serviceProvinceNames: string[];
  rating: number | null;
  reviewCount: number;
  verified: boolean;
  preferred: boolean;
  businessPhone?: string | null;
  businessPhoneAlt?: string | null;
  whatsappNumber?: string | null;
  businessEmail?: string | null;
  businessEmailAlt?: string | null;
  websiteUrl?: string | null;
  skills: string[];
  categories: Array<{ nameEs: string; nameEn: string; icon?: string | null }>;
  services: Array<{ name: string; priceFrom?: string | null; priceUnit?: string | null; currency: string }>;
}

/** Prisma select for one card (passed to SupplierService.search). */
export const CHAT_CARD_SELECT = {
  supplierId: true,
  companyName: true,
  tagline: true,
  city: true,
  province: true,
  serviceProvinces: true,
  rating: true,
  reviewCount: true,
  verifiedAt: true,
  preferredAt: true,
  preferredUntil: true,
  businessPhone: true,
  businessPhoneAlt: true,
  whatsappNumber: true,
  businessEmail: true,
  businessEmailAlt: true,
  websiteUrl: true,
  skills: true,
  categories: { select: { isPrimary: true, category: { select: { nameEs: true, nameEn: true, icon: true } } } },
  services: { select: { name: true, priceFrom: true, priceUnit: true, currency: true } },
} as const;

type CardRow = Prisma.SupplierGetPayload<{ select: typeof CHAT_CARD_SELECT }>;

export function toChatSupplier(row: CardRow, geo: GeoService): ChatSupplier {
  const cats = [...row.categories].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));
  return {
    supplierId: row.supplierId,
    companyName: row.companyName,
    tagline: row.tagline,
    city: row.city,
    provinceName: geo.provinceName(row.province),
    serviceProvinceNames: row.serviceProvinces.map((c) => geo.provinceName(c)).filter((n): n is string => !!n),
    rating: row.rating != null ? Number(row.rating) : null,
    reviewCount: row.reviewCount,
    verified: !!row.verifiedAt,
    preferred: SupplierService.isPreferredActive(row),
    businessPhone: row.businessPhone,
    businessPhoneAlt: row.businessPhoneAlt,
    whatsappNumber: row.whatsappNumber,
    businessEmail: row.businessEmail,
    businessEmailAlt: row.businessEmailAlt,
    websiteUrl: row.websiteUrl,
    skills: row.skills,
    categories: cats.map((c) => ({ nameEs: c.category.nameEs, nameEn: c.category.nameEn, icon: c.category.icon })),
    services: row.services.slice(0, 3).map((s) => ({
      name: s.name,
      priceFrom: s.priceFrom?.toString() ?? null,
      priceUnit: s.priceUnit,
      currency: s.currency,
    })),
  };
}

/** Cards saved under an earlier reply (only the current shape is trusted). */
export function parseStoredSuppliers(json?: string | null): ChatSupplier[] {
  if (!json) return [];
  try {
    const arr = JSON.parse(json);
    return Array.isArray(arr) ? arr.filter((s) => s && typeof s === 'object' && 'supplierId' in s) : [];
  } catch {
    return [];
  }
}
