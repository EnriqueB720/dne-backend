import { PostSelect } from "src/api/post/model";

interface SearchPrismaSelect{
  post: PostSelect;
}


export interface SearchSelect {
  select?: SearchPrismaSelect;
}