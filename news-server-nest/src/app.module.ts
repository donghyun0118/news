import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ArticlesModule } from './articles/articles.module';
import { AuthModule } from './auth/auth.module';
import { CommentsModule } from './comments/comments.module';
import { DatabaseModule } from './database/database.module';
import { InquiryModule } from './inquiry/inquiry.module';
import { JobsModule } from './jobs/jobs.module';
import { KeywordsModule } from './keywords/keywords.module';
import { SavedModule } from './saved/saved.module';
import { TopicsModule } from './topics/topics.module';
import { UserModule } from './user/user.module';

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
    TopicsModule,
    JobsModule,
    KeywordsModule,
    CommentsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
