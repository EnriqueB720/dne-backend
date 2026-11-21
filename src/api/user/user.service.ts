import { ConflictException, Injectable } from '@nestjs/common';

import { PrismaService } from '@prisma-datasource';
import { UserUpdateInput } from './dto';
import { User, UserSelect } from './model';

@Injectable()
export class UserService {
  constructor(private readonly prismaService: PrismaService) {}

  public async findById(userId: number, { select }: UserSelect): Promise<User> {
    return (await this.prismaService.user.findFirst({
      where: { userId, deletedAt: null },
      select,
    })) as unknown as User;
  }

  public async findUserPassword(email: string): Promise<string | null> {
    const user = await this.prismaService.user.findUnique({
      where: { email },
      select: { password: true },
    });
    return user?.password ?? null;
  }

  public async update(
    userId: number,
    data: UserUpdateInput,
    { select }: UserSelect,
  ): Promise<User> {
    if (data.phone) {
      const taken = await this.prismaService.user.findFirst({
        where: { phone: data.phone, NOT: { userId } },
        select: { userId: true },
      });
      if (taken) throw new ConflictException('Phone number already in use');
    }
    return (await this.prismaService.user.update({
      where: { userId },
      data: {
        name: data.name?.trim() || undefined,
        phone: data.phone === '' ? null : data.phone,
        language: data.language,
        profilePicture: data.profilePicture === '' ? null : data.profilePicture,
      },
      select,
    })) as unknown as User;
  }
}
