interface CategoryPrismaSelect{
    categoryId?: boolean;
    categoryName?: boolean;
}


export interface CategorySelect {
  select?: CategoryPrismaSelect;
}