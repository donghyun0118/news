import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { InquiryModule } from './inquiry/inquiry.module';
import { SavedModule } from './saved/saved.module';
import { ArticlesModule } from './articles/articles.module';
import { TopicsModule } from './topics/topics.module';
import { JobsModule } from './jobs/jobs.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    DatabaseModule,
    AuthModule,
    UserModule,
    InquiryModule,
    SavedModule,
    ArticlesModule,
    TopicsModule,
    JobsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
