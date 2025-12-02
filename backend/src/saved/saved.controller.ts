import {
  Body,
  Controller,
  Delete,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
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
import type { Request } from 'express';
import { SavedService } from './saved.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { UpdateSavedArticleDto } from './dto/update-saved-article.dto';

interface AuthenticatedRequest extends Request {
  user: { userId: number; name: string };
}

@ApiTags('Saved Articles')
@ApiBearerAuth('bearerAuth')
@UseGuards(AuthGuard('jwt'))
@Controller('api/saved')
export class SavedController {
  constructor(private readonly savedService: SavedService) {}

  @Post('categories')
  @ApiOperation({
    summary: '카테고리 생성',
    description:
      '로그인한 사용자가 저장된 기사를 분류할 새로운 카테고리를 생성합니다.',
  })
  @ApiBody({ type: CreateCategoryDto })
  @ApiResponse({ status: 201, description: '카테고리 생성 성공' })
  @ApiResponse({ status: 400, description: '카테고리 이름이 비어 있음' })
  @ApiResponse({ status: 409, description: '이미 존재하는 카테고리 이름' })
  async createCategory(
    @Req() req: AuthenticatedRequest,
    @Body() createCategoryDto: CreateCategoryDto,
  ) {
    return this.savedService.createCategory(
      req.user.userId,
      createCategoryDto.name,
    );
  }

  @Get('categories')
  @ApiOperation({
    summary: '카테고리 목록 조회',
    description: '로그인한 사용자가 생성한 모든 카테고리를 반환합니다.',
  })
  @ApiResponse({ status: 200, description: '카테고리 목록' })
  async getCategories(@Req() req: AuthenticatedRequest) {
    return this.savedService.getCategories(req.user.userId);
  }

  @Get('articles')
  @ApiOperation({
    summary: '저장된 기사 목록 조회',
    description:
      '로그인한 사용자가 저장한 기사 목록을 반환합니다. 카테고리를 지정하면 해당 카테고리만 조회합니다.',
  })
  @ApiQuery({
    name: 'categoryId',
    required: false,
    type: Number,
    description: '조회할 카테고리 ID (생략 시 전체 기사 조회)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    example: 25,
    description: '반환할 기사 개수 (기본값 25)',
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    example: 0,
    description: '건너뛸 기사 개수 (기본값 0)',
  })
  @ApiResponse({ status: 200, description: '저장된 기사 목록' })
  async getSavedArticles(
    @Req() req: AuthenticatedRequest,
    @Query('categoryId') categoryIdRaw?: string,
    @Query('limit', new DefaultValuePipe(25)) limitRaw?: string,
    @Query('offset', new DefaultValuePipe(0)) offsetRaw?: string,
  ) {
    const parsedLimit = Number(limitRaw);
    const parsedOffset = Number(offsetRaw);
    const parsedCategory =
      categoryIdRaw !== undefined && categoryIdRaw !== ''
        ? Number(categoryIdRaw)
        : undefined;

    return this.savedService.getSavedArticles(req.user.userId, {
      categoryId: Number.isFinite(parsedCategory) ? parsedCategory : undefined,
      limit: Number.isFinite(parsedLimit) ? Math.max(1, parsedLimit) : 25,
      offset: Number.isFinite(parsedOffset) ? Math.max(0, parsedOffset) : 0,
    });
  }

  @Put('articles/:savedArticleId')
  @ApiOperation({
    summary: '저장된 기사 카테고리 변경',
    description:
      '저장된 기사를 다른 카테고리로 이동하거나 카테고리에서 제외합니다.',
  })
  @ApiParam({
    name: 'savedArticleId',
    description: '카테고리를 변경할 저장된 기사 ID (tn_user_saved_articles.id)',
    example: 12,
  })
  @ApiBody({ type: UpdateSavedArticleDto })
  @ApiResponse({ status: 200, description: '카테고리 변경 성공' })
  @ApiResponse({ status: 403, description: '본인의 카테고리가 아님' })
  @ApiResponse({ status: 404, description: '저장된 기사 또는 카테고리가 없음' })
  async updateSavedArticleCategory(
    @Req() req: AuthenticatedRequest,
    @Param('savedArticleId', ParseIntPipe) savedArticleId: number,
    @Body() updateSavedArticleDto: UpdateSavedArticleDto,
  ) {
    return this.savedService.updateSavedArticleCategory(
      req.user.userId,
      savedArticleId,
      updateSavedArticleDto.categoryId ?? null,
    );
  }

  @Put('categories/:categoryId')
  @ApiOperation({
    summary: '카테고리 이름 변경',
    description: '로그인한 사용자가 생성한 카테고리 이름을 변경합니다.',
  })
  @ApiParam({
    name: 'categoryId',
    description: '변경할 카테고리 ID',
    example: 5,
  })
  @ApiBody({ type: UpdateCategoryDto })
  @ApiResponse({ status: 200, description: '카테고리 이름 변경 성공' })
  @ApiResponse({ status: 403, description: '본인의 카테고리가 아님' })
  @ApiResponse({ status: 409, description: '이미 사용 중인 카테고리 이름' })
  async renameCategory(
    @Req() req: AuthenticatedRequest,
    @Param('categoryId', ParseIntPipe) categoryId: number,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ) {
    return this.savedService.renameCategory(
      req.user.userId,
      categoryId,
      updateCategoryDto.name,
    );
  }

  @Delete('categories/:categoryId')
  @ApiOperation({
    summary: '카테고리 삭제',
    description:
      '카테고리를 삭제하고 해당 카테고리에 속해 있던 기사들은 미분류 상태로 변경합니다.',
  })
  @ApiParam({
    name: 'categoryId',
    description: '삭제할 카테고리 ID',
    example: 5,
  })
  @ApiResponse({ status: 200, description: '카테고리 삭제 성공' })
  @ApiResponse({ status: 403, description: '본인의 카테고리가 아님' })
  async deleteCategory(
    @Req() req: AuthenticatedRequest,
    @Param('categoryId', ParseIntPipe) categoryId: number,
  ) {
    return this.savedService.deleteCategory(req.user.userId, categoryId);
  }
}
