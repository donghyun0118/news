import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module'; // <--- 1. 이 줄을 추가하세요.
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';

@Module({
  imports: [ConfigModule.forRoot(), DatabaseModule, AuthModule, UserModule], // <--- 2. 여기에 DatabaseModule을 추가하세요.
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
