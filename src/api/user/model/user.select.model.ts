interface UserPrismaSelect {
  id?: boolean;
  email?: boolean;
  name?: boolean;
  phone?: boolean;
  language?: boolean;
  country?: boolean;
  role?: boolean;
  createdAt?: boolean;
}

export interface UserSelect {
  select?: UserPrismaSelect;
}
