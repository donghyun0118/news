import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ChatModule } from '../chat/chat.module';
import { DatabaseModule } from '../database/database.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AdminController } from './admin.controller';
import { AdminJwtStrategy } from './admin.jwt.strategy';
import { AdminService } from './admin.service';

import { AdminArticlesController } from './topics/admin-articles.controller';
import { AdminTopicsController } from './topics/admin-topics.controller';
import { AdminTopicsService } from './topics/admin-topics.service';
import { AdminUsersController } from './users/admin-users.controller';
import { AdminUsersService } from './users/admin-users.service';

import { AdminInquiriesController } from './inquiries/admin-inquiries.controller';
import { AdminInquiriesService } from './inquiries/admin-inquiries.service';
import { AdminKeywordsController } from './keywords/admin-keywords.controller';
import { AdminKeywordsService } from './keywords/admin-keywords.service';

@Module({
  imports: [
    DatabaseModule,
    ConfigModule,
    NotificationsModule,
    ChatModule,
    PassportModule.register({ defaultStrategy: 'admin-jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('ADMIN_JWT_SECRET'),
        signOptions: {
          expiresIn: (configService.get<string>('ADMIN_JWT_EXPIRES_IN') ||
            '12h') as any,
        },
      }),
    }),
  ],
  controllers: [
    AdminController,
    AdminUsersController,
    AdminTopicsController,
    AdminArticlesController,
    AdminInquiriesController,
    AdminKeywordsController,
  ],
  providers: [
    AdminService,
    AdminJwtStrategy,
    AdminUsersService,
    AdminTopicsService,
    AdminInquiriesService,
    AdminKeywordsService,
  ],
  exports: [AdminService],
})
export class AdminModule {}
