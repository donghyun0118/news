import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import * as path from 'path';
import type { Pool } from 'mysql2/promise';
import { DB_CONNECTION_POOL } from '../database/database.constants';
import { CreateInquiryDto } from './dto/create-inquiry.dto';
import type { UploadedFileInfo } from '../common/types/uploaded-file-info.type';

@Injectable()
export class InquiryService {
  constructor(@Inject(DB_CONNECTION_POOL) private readonly dbPool: Pool) {}

  async createInquiry(
    userId: number,
    dto: CreateInquiryDto,
    file?: UploadedFileInfo,
  ): Promise<{ message: string }> {
    if (dto.privacy_agreement !== 'true') {
      throw new BadRequestException({
        field: 'privacy_agreement',
        message: '개인정보 수집 및 이용에 동의해야 합니다.',
      });
    }

    const appRoot = path.resolve(process.cwd());
    const filePath = file
      ? path.relative(appRoot, file.path).replace(/\\/g, '/')
      : null;
    const originalName = file ? file.originalname : null;

    try {
      await this.dbPool.query(
        'INSERT INTO tn_inquiry (user_id, subject, content, file_path, privacy_agreement, file_originalname) VALUES (?, ?, ?, ?, ?, ?)',
        [userId, dto.subject, dto.content, filePath, true, originalName],
      );
      return { message: '문의가 성공적으로 접수되었습니다.' };
    } catch (error) {
      console.error('Error submitting inquiry:', error);
      throw new InternalServerErrorException({
        message: '문의 접수 중 오류가 발생했습니다.',
      });
    }
  }

  async getMyInquiries(userId: number) {
    try {
      const [rows] = await this.dbPool.query(
        'SELECT id, subject, status, created_at FROM tn_inquiry WHERE user_id = ? ORDER BY created_at DESC',
        [userId],
      );
      return rows;
    } catch (error) {
      console.error('Error fetching user inquiries:', error);
      throw new InternalServerErrorException({
        message: '문의 이력을 조회하는 중 오류가 발생했습니다.',
      });
    }
  }

  async getInquiryDetail(userId: number, inquiryId: number) {
    try {
      const [inquiryRows]: any = await this.dbPool.query(
        'SELECT id, subject, content, file_path, file_originalname, status, created_at FROM tn_inquiry WHERE id = ? AND user_id = ?',
        [inquiryId, userId],
      );

      if (inquiryRows.length === 0) {
        throw new NotFoundException({
          message: '문의가 존재하지 않거나 접근 권한이 없습니다.',
        });
      }

      const [replyRows]: any = await this.dbPool.query(
        'SELECT id, content, created_at FROM tn_inquiry_reply WHERE inquiry_id = ?',
        [inquiryId],
      );

      return {
        inquiry: inquiryRows[0],
        reply: replyRows.length > 0 ? replyRows[0] : null,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error(
        `Error fetching inquiry details for ID ${inquiryId}:`,
        error,
      );
      throw new InternalServerErrorException({
        message: '문의 상세 정보를 조회하는 중 오류가 발생했습니다.',
      });
    }
  }
}
