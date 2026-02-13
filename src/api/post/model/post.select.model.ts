import { CategorySelect } from "src/api/category/model";
import { SupplierSelect } from "src/api/supplier/model";

interface PostPrismaSelect{
    postId?: boolean;
    supplier?: SupplierSelect;
    category?: CategorySelect;
    title?: boolean;
    description?: boolean;
    price?: boolean;
    createdAt?: boolean;
    media_url?: boolean;
}


export interface PostSelect {
  select?: PostPrismaSelect;
}