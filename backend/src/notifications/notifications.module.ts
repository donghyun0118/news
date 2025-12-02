import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ChatModule } from '../chat/chat.module';
import { DatabaseModule } from '../database/database.module';
import { InternalController } from './internal.controller';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [DatabaseModule, ChatModule, ConfigModule],
  controllers: [NotificationsController, InternalController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
