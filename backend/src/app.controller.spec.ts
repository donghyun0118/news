import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      // AppService를 모의(mock) 처리하여 실제 DB 연결 없이 테스트
      providers: [
        {
          provide: AppService,
          useValue: {
            getDbStatus: jest.fn().mockResolvedValue('Connected'),
          },
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('getHealth', () => {
    it('should return server and database status', async () => {
      // getHealth 메소드가 비동기이므로 await 사용
      const result = await appController.getHealth();
      // 반환된 값이 예상과 일치하는지 확인
      expect(result).toEqual({
        server: 'ok',
        database: 'Connected',
      });
    });
  });
});
