import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('/health')
  async getHealth() {
    const dbStatus = await this.appService.getDbStatus();
    return {
      server: 'ok',
      database: dbStatus,
    };
  }
}
