
interface PostPrismaSelect{
    postId?: boolean;
    supplier?: boolean; //TODO: link to Supplier model when model is created
    category?: boolean;
    title?: boolean;
    description?: boolean;
    price?: boolean;
    createdAt?: boolean;
    media_url?: boolean;
}


export interface PostSelect {
  select?: PostPrismaSelect;
}