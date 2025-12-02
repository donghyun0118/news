import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AdminGuard } from '../admin.guard';
import { AdminInquiriesService } from './admin-inquiries.service';
import { ReplyInquiryDto } from './dto/reply-inquiry.dto';

@ApiTags('Admin Inquiries')
@Controller('api/admin/inquiries')
@UseGuards(AdminGuard)
@ApiBearerAuth('bearerAuth')
export class AdminInquiriesController {
  constructor(private readonly adminInquiriesService: AdminInquiriesService) {}

  @Get()
  @ApiOperation({ summary: '문의 목록 조회 (페이징)' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiResponse({ status: 200, description: '문의 목록' })
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.adminInquiriesService.findAll(Number(page), Number(limit));
  }

  @Get(':inquiryId')
  @ApiOperation({ summary: '문의 상세 정보 조회' })
  @ApiResponse({ status: 200, description: '문의 상세 정보' })
  async findOne(@Param('inquiryId') inquiryId: number) {
    return this.adminInquiriesService.findOne(inquiryId);
  }

  @Post(':inquiryId/reply')
  @ApiOperation({ summary: '문의 답변 등록' })
  @ApiResponse({ status: 201, description: '답변 등록 성공' })
  async reply(
    @Param('inquiryId') inquiryId: number,
    @Body() dto: ReplyInquiryDto,
    @Req() req: any,
  ) {
    const adminUsername = req.user?.username || 'admin';
    return this.adminInquiriesService.reply(
      inquiryId,
      dto.content,
      adminUsername,
    );
  }
}
