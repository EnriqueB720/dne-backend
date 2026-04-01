import * as bcrypt from 'bcrypt';
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LoginOutput, LoginUserInput, SignUpInput } from './dto';
import { UserSelect } from 'src/api/user/model';
import { User } from 'src/api/user/model/user.model';
import { UserService } from 'src/api/user/user.service';
import { SupplierService } from 'src/api/supplier/supplier.service';
import { Role } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    private readonly supplierService: SupplierService,
  ) {}

  async validateUser(email: string, password: string): Promise<User | null> {
    try {
      const user = await this.userService.findOne(
        {
          where: {
            email,
          },
        },
        {
          select: {
            userId: true,
            email: true,
            name: true,
            phone: true,
            language: true,
            country: true,
            role: true,
            profilePicture: true,
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
                posts: {
                  select: {
                    postId: true,
                    title: true,
                    description: true,
                    media_url: true,
                    price: true,
                    createdAt: true,
                    category: {
                      select: {
                        categoryId: true,
                        categoryName: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      );

      if (!user) {
        throw new Error('Email is incorrect');
      }

      const userPassword = await this.userService.findUserPassword({
        where: { email },
      });

      const valid = await bcrypt.compare(password, userPassword);

      if (!valid) {
        throw new Error('Invalid password');
      }

      return user && valid ? user : null;
    } catch (error) {
      throw new Error(error);
    }
  }

  async login({ email, password }: LoginUserInput) {
    const user = await this.validateUser(email, password);

    if (!user) return null;
    return {
      access_token: this.jwtService.sign({
        email: user.email,
        sub: user.userId,
        expiresIn: '1h',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      }),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      user,
    } as LoginOutput;
  }

  async signup(signUpInput: SignUpInput, select: UserSelect) {
    const userPassword = await this.userService.findUserPassword({
      where: {
        email: signUpInput.email,
      },
    });

    if (userPassword) {
      throw new Error('User already exists!');
    }

    const companyExists = await this.supplierService.companyNameExists(
      signUpInput.companyName,
    );

    if (companyExists) {
      throw new Error('Company name already exists!');
    }

    const password = await bcrypt.hash(signUpInput.password, 10);

    const { companyName, ...userData } = signUpInput;

    return this.userService.create(
      {
        ...userData,
        password,
        companyName, //used for supplier creation
        role: Role.SUPPLIER,
        subscription: {
          planId: 1,
          status: 'ACTIVE',
          startDate: new Date(),
          endDate: new Date(new Date().getDate() + 14),
        },
      },
      {
        ...select,
      },
    );
  }

  async refreshUser(token: string) {
    const token_decoded = this.jwtService.decode(token);

    if (new Date() > new Date(token_decoded.expiresAt)) {
      return null;
    } else {
      const user = await this.userService.findOne(
        {
          where: {
            email: token_decoded.email,
          },
        },
        {
          select: {
            userId: true,
            email: true,
            name: true,
            phone: true,
            language: true,
            country: true,
            role: true,
            profilePicture: true,
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
                posts: {
                  select: {
                    postId: true,
                    title: true,
                    description: true,
                    media_url: true,
                    price: true,
                    createdAt: true,
                    category: {
                      select: {
                        categoryId: true,
                        categoryName: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      );

      return {
        access_token: this.jwtService.sign({
          email: user.email,
          sub: user.userId,
          expiresIn: '1h',
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        }),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        user,
      } as LoginOutput;
    }
  }
}
