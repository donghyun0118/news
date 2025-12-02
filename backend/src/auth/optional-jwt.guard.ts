import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return true;
    }

    try {
      await super.canActivate(context);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        return true;
      }
      throw error;
    }
    return true;
  }

  handleRequest(
    err: unknown,
    user: any,
    _info: unknown,
    context: ExecutionContext,
  ) {
    const request = context.switchToHttp().getRequest<Request>();
    if (user) {
      request.user = user;
    }
    if (err) {
      throw err;
    }
    return user || null;
  }
}
