import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { KeywordsController } from './keywords.controller';
import { KeywordsService } from './keywords.service';

@Module({
  imports: [DatabaseModule],
  controllers: [KeywordsController],
  providers: [KeywordsService],
})
export class KeywordsModule {}
