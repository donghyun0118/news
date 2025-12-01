import { Controller, Param, Patch, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AdminGuard } from '../admin.guard';
import { AdminTopicsService } from './admin-topics.service';

@ApiTags('Admin Articles')
@Controller('api/admin/articles')
@UseGuards(AdminGuard)
@ApiBearerAuth('bearerAuth')
export class AdminArticlesController {
  constructor(private readonly adminTopicsService: AdminTopicsService) {}

  @Patch(':articleId/delete')
  @ApiOperation({ summary: '기사 삭제 (상태 변경)' })
  @ApiResponse({ status: 200, description: '삭제 성공' })
  async deleteArticle(@Param('articleId') articleId: number) {
    return this.adminTopicsService.deleteArticle(articleId);
  }

  @Patch(':articleId/publish')
  @ApiOperation({ summary: '기사 발행' })
  @ApiResponse({ status: 200, description: '발행 성공' })
  async publishArticle(@Param('articleId') articleId: number) {
    return this.adminTopicsService.publishArticle(articleId);
  }

  @Patch(':articleId/unpublish')
  @ApiOperation({ summary: '기사 발행 취소' })
  @ApiResponse({ status: 200, description: '발행 취소 성공' })
  async unpublishArticle(@Param('articleId') articleId: number) {
    return this.adminTopicsService.unpublishArticle(articleId);
  }
}
