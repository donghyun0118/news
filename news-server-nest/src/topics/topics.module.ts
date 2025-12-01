import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { TopicsController } from './topics.controller';
import { TopicsService } from './topics.service';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [DatabaseModule, AuthModule, PassportModule],
  controllers: [TopicsController],
  providers: [TopicsService],
})
export class TopicsModule {}
