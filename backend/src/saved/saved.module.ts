import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { SavedService } from './saved.service';
import { SavedController } from './saved.controller';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [DatabaseModule, AuthModule, PassportModule],
  controllers: [SavedController],
  providers: [SavedService],
})
export class SavedModule {}
