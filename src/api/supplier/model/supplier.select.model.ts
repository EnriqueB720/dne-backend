import { PostSelect } from "src/api/post/model";

interface SupplierPrismaSelect{
    supplierId?: boolean;
    user?: boolean;
    companyName?: boolean;
    posts?: PostSelect;
}


export interface SupplierSelect {
  select?: SupplierPrismaSelect;
}