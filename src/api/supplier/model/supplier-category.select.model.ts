import { CategorySelect } from 'src/api/category/model';

interface SupplierCategoryPrismaSelect {
  supplierId?: boolean;
  categoryId?: boolean;
  isPrimary?: boolean;
  category?: CategorySelect;
}

export interface SupplierCategorySelect {
  select?: SupplierCategoryPrismaSelect;
}
