import { SupplierSelect } from 'src/api/supplier/model';

interface FavoritePrismaSelect {
  favoriteId?: boolean;
  customerId?: boolean;
  supplierId?: boolean;
  notes?: boolean;
  createdAt?: boolean;
  supplier?: SupplierSelect;
}

export interface FavoriteSelect {
  select?: FavoritePrismaSelect;
}
