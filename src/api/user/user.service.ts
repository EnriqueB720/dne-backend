import { Injectable } from '@nestjs/common';
import { User, UserSelect } from './model';
import { UserArgs, UserCreateInput, UserWhereInput } from './dto';
import { PrismaService } from '@prisma-datasource';

@Injectable()
export class UserService {
  constructor(private readonly prismaService: PrismaService) {}

  public async findOne(
    { where }: UserArgs,
    { select }: UserSelect,
  ): Promise<User> {
    return await this.prismaService.user.findFirst({
      where,
      select,
    });
  }

  public async findUserPassword({ where: { email } }: UserArgs) {
    const user = await this.prismaService.user.findUnique({
      where: {
        email,
      },
    });
    return user ? user.password : null;
  }

  public async create(
    data: UserCreateInput,
    { select }: UserSelect,
  ): Promise<User> {
    return await this.prismaService.user.create({
      data,
      select,
    });
  }
}
