import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt.guard';

import { VoteDto } from './dto/vote.dto';
import { TopicsService } from './topics.service';

interface AuthenticatedRequest extends Request {
  user?: { userId: number; name: string };
}

@ApiTags('Topics')
@Controller('api/topics')
export class TopicsController {
  constructor(private readonly topicsService: TopicsService) {}

  @Get()
  @ApiOperation({
    summary: '발행된 토픽 목록 조회',
    description:
      '사용자에게 노출되는 발행 상태의 토픽을 최신순으로 반환합니다.',
  })
  @ApiResponse({ status: 200, description: '토픽 목록' })
  async getTopics() {
    return this.topicsService.getTopics();
  }

  @Get('popular-ranking')
  @ApiOperation({
    summary: '인기 토픽 순위 조회',
    description:
      '인기도(popularity_score)를 기준으로 상위 10개의 토픽을 반환합니다.',
  })
  @ApiResponse({ status: 200, description: '인기 토픽 목록' })
  async getPopularRanking() {
    return this.topicsService.getPopularRanking();
  }

  @Get('latest')
  @ApiOperation({
    summary: '최신 토픽 10개 조회',
    description: '가장 최근에 발행된 토픽 10개를 반환합니다.',
  })
  @ApiResponse({ status: 200, description: '최신 토픽 목록' })
  async getLatestTopics() {
    return this.topicsService.getLatestTopics();
  }

  @Get('popular-all')
  @ApiOperation({
    summary: '전체 발행 토픽 인기 순 정렬',
    description: '모든 발행 토픽을 인기도 순으로 정렬해 반환합니다.',
  })
  @ApiResponse({ status: 200, description: '정렬된 토픽 목록' })
  async getAllPopularTopics() {
    return this.topicsService.getAllPopularTopics();
  }

  @Get(':topicId')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({
    summary: '토픽 상세 및 관련 기사 조회',
    description: '선택한 토픽의 상세 정보와 좌·우 기사 목록을 함께 반환합니다.',
  })
  @ApiParam({ name: 'topicId', description: '조회할 토픽 ID', example: 101 })
  @ApiResponse({ status: 200, description: '토픽 상세 정보와 기사 목록' })
  @ApiResponse({ status: 404, description: '토픽을 찾을 수 없습니다.' })
  async getTopicDetail(
    @Req() req: AuthenticatedRequest,
    @Param('topicId', ParseIntPipe) topicId: number,
  ) {
    return this.topicsService.getTopicDetail(topicId, req.user?.userId);
  }

  @Post(':topicId/view')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({
    summary: '토픽 조회수 증가',
    description:
      '동일 사용자 또는 IP에 대해 24시간 동안 한 번만 토픽 조회수를 증가시킵니다.',
  })
  @ApiParam({
    name: 'topicId',
    description: '조회수를 증가시킬 토픽 ID',
    example: 101,
  })
  @ApiResponse({ status: 200, description: '조회수 증가 또는 쿨다운 안내' })
  @ApiResponse({ status: 404, description: '토픽을 찾을 수 없습니다.' })
  async incrementTopicView(
    @Req() req: AuthenticatedRequest,
    @Param('topicId', ParseIntPipe) topicId: number,
  ) {
    const userId = req.user?.userId ?? null;
    const ip = req.ip ?? '';
    return this.topicsService.incrementTopicView(topicId, userId, ip);
  }

  @Post(':topicId/stance-vote')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({
    summary: '토픽 주장 투표하기',
    description:
      '사용자가 특정 토픽에 대해 자신의 입장을 투표합니다. 투표는 한 번만 가능하며, 변경할 수 없습니다.',
  })
  @ApiParam({ name: 'topicId', description: '투표할 토픽 ID', example: 101 })
  @ApiResponse({ status: 200, description: '투표 성공' })
  @ApiResponse({ status: 400, description: '이미 투표했거나 잘못된 요청' })
  async castStanceVote(
    @Req() req: AuthenticatedRequest,
    @Param('topicId', ParseIntPipe) topicId: number,
    @Body() body: VoteDto,
  ) {
    return this.topicsService.castStanceVote(
      topicId,
      req.user!.userId,
      body.side,
    );
  }
}
