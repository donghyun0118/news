import {
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications')
@Controller('api/notifications')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth('bearerAuth')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: '내 알림 목록 조회' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: '페이지 번호 (기본값: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: '페이지당 항목 수 (기본값: 20)',
  })
  @ApiResponse({ status: 200, description: '알림 목록 조회 성공' })
  async getNotifications(
    @Req() req: any,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.notificationsService.getNotifications(
      req.user.userId,
      page,
      limit,
    );
  }

  @Get('unread-count')
  @ApiOperation({ summary: '읽지 않은 알림 개수 조회' })
  @ApiResponse({ status: 200, description: '조회 성공' })
  async getUnreadCount(@Req() req: any) {
    return this.notificationsService.getUnreadCount(req.user.userId);
  }

  @Post(':id/read')
  @ApiOperation({ summary: '알림 읽음 처리' })
  @ApiParam({ name: 'id', description: '알림 ID' })
  @ApiResponse({ status: 200, description: '처리 성공' })
  @ApiResponse({ status: 404, description: '알림을 찾을 수 없음' })
  async markAsRead(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.notificationsService.markAsRead(id, req.user.userId);
  }

  @Post('read-all')
  @ApiOperation({ summary: '모든 알림 읽음 처리' })
  @ApiResponse({ status: 200, description: '처리 성공' })
  async markAllAsRead(@Req() req: any) {
    return this.notificationsService.markAllAsRead(req.user.userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: '알림 삭제' })
  @ApiParam({ name: 'id', description: '알림 ID' })
  @ApiResponse({ status: 200, description: '삭제 성공' })
  @ApiResponse({ status: 404, description: '알림을 찾을 수 없음' })
  async deleteNotification(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
  ) {
    return this.notificationsService.deleteNotification(id, req.user.userId);
  }
}
