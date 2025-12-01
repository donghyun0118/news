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
    .addTag('App', 'health 체크 API')
    .addTag('Auth', '사용자 인증 API')
    .addTag('Users', '사용자 관리 API')
    .addTag('Topics', '토픽(ROUND2) 관리 API')
    .addTag('Keywords', '키워드 관리 API')
    .addTag('Articles', '기사 관리 API')
    .addTag('Comments', '토픽(ROUND2) 댓글 관련 API')
    .addTag('Saved Articles', '저장된 기사 관리 API')
    .addTag('Jobs', '스케줄러 관리 API')
    .addTag('Inquiries', '문의 관리 API')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        in: 'header',
      },
      'bearerAuth',
    )
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true, // Bearer 토큰을 localStorage에 저장하여 새로고침 후에도 유지
    },
  });

  // .env 파일의 PORT를 사용, 없으면 3001번 포트
  const port = process.env.PORT || 3001;

  await app.listen(port);
  console.log(`Nest.js server is running on http://localhost:${port}`);
  console.log(`Swagger UI is available at http://localhost:${port}/api-docs`);
}

bootstrap().catch((err) => {
  console.error('Error during server startup:', err);
});
