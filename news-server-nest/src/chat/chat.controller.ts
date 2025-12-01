import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Inject,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Pool } from 'mysql2/promise';
import { DB_CONNECTION_POOL } from '../database/database.constants';
import { ChatService } from './chat.service';
import {
  CreateChatMessageDto,
  CreatePresignedUrlDto,
  ReportChatMessageDto,
} from './dto/chat.dto';

@ApiTags('Chats')
@Controller()
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    @Inject(DB_CONNECTION_POOL) private dbPool: Pool,
    private configService: ConfigService,
  ) {}

  @Get('api/topics/:topicId/chat')
  @ApiOperation({ summary: '특정 토픽의 채팅 메시지 목록 조회' })
  @ApiParam({ name: 'topicId', description: '토픽 ID' })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: '한 번에 가져올 메시지 수 (기본값: 50)',
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: '건너뛸 메시지 수 (기본값: 0)',
  })
  @ApiResponse({ status: 200, description: '채팅 메시지 목록' })
  async getChatMessages(
    @Param('topicId', ParseIntPipe) topicId: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
    @Req() req: any,
  ) {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    return this.chatService.getChatMessages(topicId, limit, offset, baseUrl);
  }

  @Post('api/topics/:topicId/chat')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: '새 채팅 메시지 작성' })
  @ApiParam({ name: 'topicId', description: '토픽 ID' })
  @ApiBody({ type: CreateChatMessageDto })
  @ApiResponse({ status: 201, description: '메시지 작성 성공' })
  @ApiResponse({ status: 400, description: '메시지 내용이 비어있거나 너무 김' })
  @ApiResponse({ status: 401, description: '인증 실패' })
  async createChatMessage(
    @Param('topicId', ParseIntPipe) topicId: number,
    @Body() createChatMessageDto: CreateChatMessageDto,
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    return this.chatService.createChatMessage(
      topicId,
      userId,
      createChatMessageDto.content,
      baseUrl,
    );
  }

  @Delete('api/chat/:messageId')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: '내 채팅 메시지 삭제' })
  @ApiParam({ name: 'messageId', description: '메시지 ID' })
  @ApiResponse({ status: 200, description: '메시지 삭제 성공' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  @ApiResponse({ status: 404, description: '메시지를 찾을 수 없음' })
  async deleteChatMessage(
    @Param('messageId', ParseIntPipe) messageId: number,
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    return this.chatService.deleteChatMessage(messageId, userId);
  }

  @Post('api/chat/:messageId/report')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: '채팅 메시지 신고' })
  @ApiParam({ name: 'messageId', description: '메시지 ID' })
  @ApiBody({ type: ReportChatMessageDto })
  @ApiResponse({ status: 200, description: '신고 처리 완료' })
  async reportChatMessage(
    @Param('messageId', ParseIntPipe) messageId: number,
    @Body() reportDto: ReportChatMessageDto,
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    return this.chatService.reportChatMessage(
      messageId,
      userId,
      reportDto.reason,
    );
  }

  @Post('api/chat/presigned-url')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: '파일 업로드를 위한 Presigned URL 생성' })
  @ApiBody({ type: CreatePresignedUrlDto })
  @ApiResponse({ status: 200, description: 'Presigned URL 생성 성공' })
  @ApiResponse({ status: 400, description: '잘못된 요청' })
  async createPresignedUrl(@Body() dto: CreatePresignedUrlDto) {
    return this.chatService.createPresignedUrl(dto.fileName, dto.fileType);
  }
}
