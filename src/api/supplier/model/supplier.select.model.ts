import { PostSelect } from 'src/api/post/model';
import { UserSelect } from 'src/api/user/model';

interface SupplierPrismaSelect {
  supplierId?: boolean;
  user?: UserSelect;
  companyName?: boolean;
  posts?: PostSelect;
}

export interface SupplierSelect {
  select?: SupplierPrismaSelect;
}
