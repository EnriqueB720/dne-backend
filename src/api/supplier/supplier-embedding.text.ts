/**
 * Compose the single string that represents a supplier for semantic
 * search. High-signal fields first so token truncation, if it ever
 * happens, drops the least-informative tail. Shared by the backfill
 * script and the SupplierService re-embed hook so both produce
 * comparable vectors.
 */
export interface SupplierEmbeddingSource {
  companyName: string;
  tagline: string | null;
  description: string | null;
  services: { name: string; description: string | null }[];
  categories: { category: { categoryName: string } }[];
}

export function buildSupplierEmbeddingText(s: SupplierEmbeddingSource): string {
  const parts: string[] = [s.companyName];
  if (s.tagline) parts.push(s.tagline);
  if (s.description) parts.push(s.description);
  if (s.services.length > 0) {
    parts.push(
      'Services: ' +
        s.services
          .map((sv) => (sv.description ? `${sv.name} — ${sv.description}` : sv.name))
          .join('; '),
    );
  }
  if (s.categories.length > 0) {
    parts.push(
      'Categories: ' + s.categories.map((c) => c.category.categoryName).join(', '),
    );
  }
  return parts.join('. ');
}
