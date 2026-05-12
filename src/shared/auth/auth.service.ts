import * as bcrypt from 'bcrypt';
import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LoginOutput, LoginUserInput, SignUpInput } from './dto';
import { UserSelect } from 'src/api/user/model';
import { User } from 'src/api/user/model/user.model';
import { UserService } from 'src/api/user/user.service';
import { SupplierService } from 'src/api/supplier/supplier.service';
import { Role } from '@prisma/client';
import { PrismaService } from '@prisma-datasource';

const USER_PROFILE_SELECT = {
  userId: true,
  email: true,
  name: true,
  phone: true,
  language: true,
  country: true,
  role: true,
  profilePicture: true,
  isCustomer: true,
  isSupplier: true,
  isAdmin: true,
  createdAt: true,
  subscription: {
    select: {
      subscriptionId: true,
      userId: true,
      planId: true,
      plan: {
        select: {
          planId: true,
          planName: true,
          price: true,
          features: true,
        },
      },
      status: true,
      startDate: true,
      endDate: true,
    },
  },
  supplier: {
    select: {
      supplierId: true,
      companyName: true,
    },
  },
  customer: {
    select: {
      customerId: true,
      userId: true,
      defaultCity: true,
      marketingOptIn: true,
      createdAt: true,
      updatedAt: true,
    },
  },
} as const;

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    private readonly supplierService: SupplierService,
    private readonly prismaService: PrismaService,
  ) {}

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.prismaService.user.findFirst({
      where: { email },
      select: USER_PROFILE_SELECT,
    });

    if (!user) {
      throw new UnauthorizedException('Email is incorrect');
    }

    const userPassword = await this.userService.findUserPassword({
      where: { email },
    });

    const valid = await bcrypt.compare(password, userPassword);

    if (!valid) {
      throw new UnauthorizedException('Invalid password');
    }

    return user as unknown as User;
  }

  async login({ email, password }: LoginUserInput) {
    const user = await this.validateUser(email, password);
    if (!user) return null;

    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    return {
      access_token: this.jwtService.sign({
        email: user.email,
        sub: user.userId,
        expiresIn: '1h',
        expiresAt,
      }),
      expiresAt,
      user,
    } as LoginOutput;
  }

  async signup(input: SignUpInput, _select: UserSelect) {
    const existingPassword = await this.userService.findUserPassword({
      where: { email: input.email },
    });
    if (existingPassword) {
      throw new ConflictException('User already exists');
    }

    const role = (input.role ?? 'CUSTOMER').toUpperCase();
    if (role !== 'CUSTOMER' && role !== 'SUPPLIER') {
      throw new BadRequestException('role must be CUSTOMER or SUPPLIER');
    }

    if (role === 'SUPPLIER') {
      if (!input.companyName || input.companyName.trim() === '') {
        throw new BadRequestException('companyName is required for suppliers');
      }
      const taken = await this.supplierService.companyNameExists(
        input.companyName,
      );
      if (taken) {
        throw new ConflictException('Company name already exists');
      }
    }

    const passwordHash = await bcrypt.hash(input.password, 10);

    const baseUser = {
      email: input.email,
      name: input.name,
      phone: input.phone,
      country: input.country,
      password: passwordHash,
      // Legacy single-role enum has no CUSTOMER value; the multi-role flags
      // (isCustomer / isSupplier / isAdmin) are the real source of truth.
      role: Role.SUPPLIER,
      profilePicture: input.profilePicture,
    };

    if (role === 'CUSTOMER') {
      return this.prismaService.user.create({
        data: {
          ...baseUser,
          isCustomer: true,
          isSupplier: false,
          customer: { create: {} },
        },
        select: USER_PROFILE_SELECT,
      });
    }

    return this.prismaService.user.create({
      data: {
        ...baseUser,
        isCustomer: false,
        isSupplier: true,
        supplier: { create: { companyName: input.companyName! } },
        subscription: {
          create: [
            {
              planId: 1,
              status: 'ACTIVE',
              startDate: new Date(),
              endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            },
          ],
        },
      },
      select: USER_PROFILE_SELECT,
    });
  }

  async refreshUser(token: string) {
    const token_decoded = this.jwtService.decode(token);

    if (!token_decoded || new Date() > new Date(token_decoded.expiresAt)) {
      return null;
    }

    const user = await this.prismaService.user.findFirst({
      where: { email: token_decoded.email },
      select: USER_PROFILE_SELECT,
    });

    if (!user) return null;

    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    return {
      access_token: this.jwtService.sign({
        email: user.email,
        sub: user.userId,
        expiresIn: '1h',
        expiresAt,
      }),
      expiresAt,
      user,
    } as LoginOutput;
  }
}
