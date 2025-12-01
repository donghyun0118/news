import {
  Body, // Added
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query, // Added
  Req,
  UseGuards,
  BadRequestException, // Added for unsaveArticle validation
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiBody, // Added
  ApiOperation,
  ApiParam,
  ApiQuery, // Added
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt.guard';
import { ArticlesService } from './articles.service';
import { SaveArticleDto } from './dto/save-article.dto'; // Added

interface AuthenticatedRequest extends Request {
  user?: { userId: number; name: string };
}

const parseLimit = (raw?: string): number => {
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    return 30;
  }
  return Math.floor(value);
};

const parseOffset = (raw?: string): number => {
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }
  return Math.floor(value);
};

@ApiTags('Articles')
@Controller('articles')
export class ArticlesController {
  constructor(private readonly articlesService: ArticlesService) {}

  @Get('search')
  @ApiOperation({
    summary: '기사 검색 (AI 시맨틱 검색)',
    description:
      '검색어(q)를 받아, AI 모델을 통해 의미적으로 가장 유사한 기사를 검색합니다.',
  })
  @ApiQuery({
    name: 'q',
    required: true,
    description: '검색할 키워드',
  })
  @ApiResponse({ status: 200, description: '검색 결과 목록' })
  @ApiResponse({ status: 400, description: '검색어가 필요합니다.' })
  async searchArticles(@Query('q') q: string) {
    return this.articlesService.searchArticles(q);
  }

  @Get('by-category')
  @ApiOperation({
    summary: '카테고리별 최신 기사 목록 조회',
    description:
      '특정 카테고리의 최신 기사를 조회합니다. 언론사 구분 없이 최근 7일간의 모든 기사를 최신순으로 반환합니다.',
  })
  @ApiQuery({
    name: 'name',
    required: true,
    description: '조회할 카테고리 이름',
  })
  @ApiResponse({ status: 200, description: '카테고리 기사 목록' })
  @ApiResponse({ status: 400, description: '카테고리 이름이 필요합니다.' })
  async getArticlesByCategory(@Query('name') name: string) {
    return this.articlesService.getArticlesByCategory(name);
  }

  @Get('exclusives')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({
    summary: '[단독] 기사 목록 조회',
    description: "제목에 '[단독]'이 포함된 최신 기사 목록을 반환합니다.",
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    example: 30,
    description: '가져올 기사 수 (기본값 30)',
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    example: 0,
    description: '건너뛸 기사 수 (기본값 0)',
  })
  @ApiResponse({ status: 200, description: '[단독] 기사 목록' })
  async getExclusiveArticles(
    @Req() req: AuthenticatedRequest,
    @Query('limit', new DefaultValuePipe('30')) limitRaw?: string,
    @Query('offset', new DefaultValuePipe('0')) offsetRaw?: string,
  ) {
    const limit = parseLimit(limitRaw);
    const offset = parseOffset(offsetRaw);
    return this.articlesService.getExclusiveArticles(
      limit,
      offset,
      req.user?.userId,
    );
  }

  @Get('breaking')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({
    summary: '[속보] 기사 목록 조회',
    description: "제목에 '[속보]'이 포함된 최신 기사 목록을 반환합니다.",
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    example: 30,
    description: '가져올 기사 수 (기본값 30)',
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    example: 0,
    description: '건너뛸 기사 수 (기본값 0)',
  })
  @ApiResponse({ status: 200, description: '[속보] 기사 목록' })
  async getBreakingArticles(
    @Req() req: AuthenticatedRequest,
    @Query('limit', new DefaultValuePipe('30')) limitRaw?: string,
    @Query('offset', new DefaultValuePipe('0')) offsetRaw?: string,
  ) {
    const limit = parseLimit(limitRaw);
    const offset = parseOffset(offsetRaw);
    return this.articlesService.getBreakingArticles(
      limit,
      offset,
      req.user?.userId,
    );
  }

  @Post(':articleId/save')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({
    summary: '기사 저장',
    description: '지정한 기사를 저장 목록에 추가합니다. `articleType`에 따라 `tn_home_article`의 ID로 통일하여 저장합니다.',
  })
  @ApiParam({ name: 'articleId', description: '기사 ID', example: 123 })
  @ApiBody({ type: SaveArticleDto }) // Added
  @ApiResponse({ status: 201, description: '기사 저장 성공' })
  @ApiResponse({ status: 400, description: '잘못된 articleType' }) // Added
  @ApiResponse({ status: 404, description: '기사를 찾을 수 없습니다.' })
  @ApiResponse({ status: 409, description: '이미 저장된 기사입니다.' })
  async saveArticle(
    @Req() req: AuthenticatedRequest,
    @Param('articleId', ParseIntPipe) articleId: number,
    @Body() saveArticleDto: SaveArticleDto, // Added
  ) {
    return this.articlesService.saveArticle(articleId, req.user!.userId, saveArticleDto.articleType); // Added articleType
  }

  @Delete(':articleId/save')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({
    summary: '기사 저장 취소',
    description: '저장된 기사에서 제거합니다.',
  })
  @ApiParam({ name: 'articleId', description: '기사 ID', example: 123 })
  @ApiQuery({ name: 'articleType', enum: ['home', 'topic'], required: true, description: "저장 취소할 기사의 종류. 'home' 또는 'topic'" }) // Added
  @ApiResponse({ status: 200, description: '기사 저장 취소 성공' })
  @ApiResponse({ status: 400, description: '잘못된 articleType' }) // Added
  @ApiResponse({ status: 404, description: '저장된 기사를 찾을 수 없습니다.' })
  async unsaveArticle(
    @Req() req: AuthenticatedRequest,
    @Param('articleId', ParseIntPipe) articleId: number,
    @Query('articleType') articleType: 'home' | 'topic', // Added
  ) {
    if (!articleType || !['home', 'topic'].includes(articleType)) {
        throw new BadRequestException("A valid articleType ('home' or 'topic') is required as a query parameter.");
    }
    return this.articlesService.unsaveArticle(articleId, req.user!.userId, articleType); // Added articleType
  }
}
