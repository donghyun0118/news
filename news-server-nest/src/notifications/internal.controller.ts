import {
  Body,
  Controller,
  ForbiddenException,
  Post,
  Req,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiBody,
  ApiHeader,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { SendNotificationDto } from './dto/send-notification.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('Internal')
@Controller('api/internal')
export class InternalController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly configService: ConfigService,
  ) {}

  @Post('send-notification')
  @ApiOperation({
    summary: '(내부용) 조건부 실시간 알림 발송',
    description:
      "내부 시스템(예: Python 스크립트)에서 이 API를 호출하여, 특정 사용자 그룹에게 실시간 알림을 보냅니다. 헤더에 'x-internal-secret'으로 내부용 시크릿 키를 포함해야 합니다.",
  })
  @ApiHeader({
    name: 'x-internal-secret',
    required: true,
    description: '내부 API 호출을 위한 시크릿 키',
  })
  @ApiBody({ type: SendNotificationDto })
  @ApiResponse({ status: 202, description: '알림 발송 작업이 시작됨' })
  @ApiResponse({ status: 400, description: '잘못된 요청 데이터' })
  @ApiResponse({ status: 403, description: '인증 실패' })
  async sendNotification(
    @Req() req: Request,
    @Body() sendNotificationDto: SendNotificationDto,
  ) {
    // Security Check
    const internalSecret = this.configService.get<string>(
      'INTERNAL_API_SECRET',
    );
    const requestSecret = req.headers['x-internal-secret'];

    if (!internalSecret || requestSecret !== internalSecret) {
      throw new ForbiddenException('Invalid or missing internal secret');
    }

    // Fire-and-forget: Respond immediately
    // The actual sending logic is awaited but happens "in the background" from the client's perspective
    this.notificationsService.sendNotificationToAll(
      sendNotificationDto.notification_type,
      sendNotificationDto.data,
    );

    return { message: 'Notification dispatch initiated.' };
  }
}
