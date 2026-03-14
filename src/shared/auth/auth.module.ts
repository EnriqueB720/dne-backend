import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthResolver } from './auth.resolver';
import { JwtStrategy, LocalStrategy } from './strategy';
import { UserModule } from '../../api/user/user.module';
import { SupplierModule } from '../../api/supplier/supplier.module';
import { ConfigModule } from '../config/config.module';

@Module({
  imports: [
    UserModule,
    SupplierModule,
    PassportModule,
    ConfigModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
    }),
  ],
  providers: [AuthService, AuthResolver, LocalStrategy, JwtStrategy],
})
export class AuthModule {}
