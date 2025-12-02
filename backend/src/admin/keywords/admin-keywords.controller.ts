import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AdminGuard } from '../admin.guard';
import { AdminKeywordsService } from './admin-keywords.service';
import { CreateKeywordDto, UpdateKeywordDto } from './dto/keyword.dto';

@ApiTags('Admin Keywords')
@Controller('api/admin/trending-keywords')
@UseGuards(AdminGuard)
@ApiBearerAuth('bearerAuth')
export class AdminKeywordsController {
  constructor(private readonly adminKeywordsService: AdminKeywordsService) {}

  @Get()
  @ApiOperation({ summary: '트렌딩 키워드 목록 조회' })
  @ApiResponse({ status: 200, description: '키워드 목록' })
  async findAll() {
    return this.adminKeywordsService.findAll();
  }

  @Post()
  @ApiOperation({ summary: '트렌딩 키워드 추가' })
  @ApiResponse({ status: 201, description: '추가 성공' })
  async create(@Body() dto: CreateKeywordDto) {
    return this.adminKeywordsService.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: '트렌딩 키워드 수정' })
  @ApiResponse({ status: 200, description: '수정 성공' })
  async update(@Param('id') id: number, @Body() dto: UpdateKeywordDto) {
    return this.adminKeywordsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '트렌딩 키워드 삭제' })
  @ApiResponse({ status: 200, description: '삭제 성공' })
  async delete(@Param('id') id: number) {
    return this.adminKeywordsService.delete(id);
  }
}
