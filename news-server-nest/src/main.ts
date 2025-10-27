import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS 허용
  app.enableCors();

  // 전역 유효성 검사 파이프 적용
  app.useGlobalPipes(new ValidationPipe());

  // Swagger 문서 설정
  const config = new DocumentBuilder()
    .setTitle('Different News API (Nest.js)')
    .setDescription('Nest.js로 마이그레이션 중인 API 명세입니다.')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document); // http://localhost:3001/api-docs 로 접속

  // .env 파일의 PORT를 사용, 없으면 3001번 포트
  const port = process.env.PORT || 3001;

  await app.listen(port);
  console.log(`Nest.js server is running on http://localhost:${port}`);
  console.log(`Swagger UI is available at http://localhost:${port}/api-docs`);
}

bootstrap().catch((err) => {
  console.error('Error during server startup:', err);
});
