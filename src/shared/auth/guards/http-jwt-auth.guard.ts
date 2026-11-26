import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** JWT guard for plain REST controllers (e.g. POST /files/upload). */
@Injectable()
export class HttpJwtAuthGuard extends AuthGuard('jwt') {}
