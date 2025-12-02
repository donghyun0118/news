import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UploadedFile as UploadedFileDecorator,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import * as fs from 'fs';
import { diskStorage } from 'multer';
import * as path from 'path';
import type { UploadedFileInfo } from '../common/types/uploaded-file-info.type';
import { CreateInquiryDto } from './dto/create-inquiry.dto';
import { InquiryService } from './inquiry.service';

const uploadDir = path.join(process.cwd(), 'uploads', 'inquiries');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const convertedName = Buffer.from(file.originalname, 'latin1').toString(
      'utf8',
    );
    const extension = path.extname(convertedName);
    const basename = path.basename(convertedName, extension);
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    file.originalname = convertedName;
    cb(null, `${basename}-${uniqueSuffix}${extension}`);
  },
});

interface AuthenticatedRequest extends Request {
  user: { userId: number; name: string };
}

@ApiTags('Inquiries')
@ApiBearerAuth('bearerAuth')
@UseGuards(AuthGuard('jwt'))
@Controller('api/inquiry')
export class InquiryController {
  constructor(private readonly inquiryService: InquiryService) {}

  @Post()
  @ApiOperation({
    summary: '문의 작성',
    description:
      '로그인한 사용자가 문의 주제와 내용을 작성하고, 필요한 경우 파일을 첨부해 문의를 등록합니다.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['subject', 'content', 'privacy_agreement'],
      properties: {
        subject: { type: 'string', description: '문의 주제' },
        content: { type: 'string', description: '문의 내용' },
        privacy_agreement: {
          type: 'string',
          description: '개인정보 수집 및 이용 동의 여부 ("true")',
          example: 'true',
        },
        attachment: {
          type: 'string',
          format: 'binary',
          description: '첨부파일 (최대 5MB)',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: '문의가 성공적으로 접수되었습니다.',
  })
  @ApiResponse({ status: 400, description: '요청 본문 검증 실패' })
  @ApiResponse({ status: 401, description: '인증 실패' })
  @UseInterceptors(
    FileInterceptor('attachment', {
      storage,
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async createInquiry(
    @Req() req: AuthenticatedRequest,
    @Body() createInquiryDto: CreateInquiryDto,
    @UploadedFileDecorator() file?: UploadedFileInfo,
  ) {
    return this.inquiryService.createInquiry(
      req.user.userId,
      createInquiryDto,
      file,
    );
  }

  @Get()
  @ApiOperation({
    summary: '내 문의 내역 목록 조회',
    description: '로그인한 사용자의 문의 내역을 최신순으로 반환합니다.',
  })
  @ApiResponse({ status: 200, description: '문의 목록 조회 성공' })
  async getMyInquiries(@Req() req: AuthenticatedRequest) {
    return this.inquiryService.getMyInquiries(req.user.userId);
  }

  @Get(':inquiryId')
  @ApiOperation({
    summary: '문의 상세 조회',
    description:
      '문의 본문과 관리자 답변을 조회합니다. 본인이 작성한 문의만 조회할 수 있습니다.',
  })
  @ApiParam({
    name: 'inquiryId',
    description: '조회할 문의 ID',
    example: 1,
  })
  @ApiResponse({ status: 200, description: '문의 상세 조회 성공' })
  @ApiResponse({
    status: 404,
    description: '문의가 존재하지 않거나 접근 권한 없음',
  })
  async getInquiryDetail(
    @Req() req: AuthenticatedRequest,
    @Param('inquiryId', ParseIntPipe) inquiryId: number,
  ) {
    return this.inquiryService.getInquiryDetail(req.user.userId, inquiryId);
  }
}
