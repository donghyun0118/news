import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WsException } from '@nestjs/websockets';
import * as jwt from 'jsonwebtoken';
import { Socket } from 'socket.io';

// 소켓에 사용자 정보를 추가하기 위한 타입 확장
export interface AuthenticatedSocket extends Socket {
  user?: jwt.JwtPayload & {
    userId: number;
    email: string;
    nickname: string;
  };
}

@Injectable()
export class WsAuthGuard implements CanActivate {
  private logger = new Logger(WsAuthGuard.name);

  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const client: AuthenticatedSocket = context.switchToWs().getClient<Socket>();
    const token = client.handshake.auth.token;

    if (!token) {
      this.logger.warn('Socket connection denied: Token not provided.');
      throw new WsException('Authentication error: Token not provided');
    }

    try {
      const jwtSecret = this.configService.get<string>('USER_JWT_SECRET');
      if (!jwtSecret) {
        this.logger.error('JWT secret is not defined.');
        throw new WsException('Internal server configuration error.');
      }

      const decoded = jwt.verify(token, jwtSecret) as AuthenticatedSocket['user'];
      client.user = decoded; // Attach user payload to the socket object
      return true;
    } catch (error) {
      this.logger.warn(`Socket connection denied: Invalid token (${error.message})`);
      throw new WsException('Authentication error: Invalid token');
    }
  }
}
