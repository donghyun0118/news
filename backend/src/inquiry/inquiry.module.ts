import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { InquiryService } from './inquiry.service';
import { InquiryController } from './inquiry.controller';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [DatabaseModule, AuthModule, PassportModule],
  controllers: [InquiryController],
  providers: [InquiryService],
})
export class InquiryModule {}
