
interface PostPrismaSelect{
    postId: true;
    supplier: true; //TODO: link to Supplier model when model is created
    category: true;
    title: true;
    description: true;
    price: true;
    createdAt: true;
    media_url: true;
}


export interface PostSelect {
  select?: PostPrismaSelect;
}