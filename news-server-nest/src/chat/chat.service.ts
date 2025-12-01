import {
  ForbiddenException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Pool, PoolConnection } from 'mysql2/promise';
import { v4 as uuidv4 } from 'uuid';
import {
  extractArticlePreview,
  extractTopicPreview,
} from '../common/utils/preview-helpers';
import { ChatGateway } from './chat.gateway';
import { DB_CONNECTION_POOL } from '../database/database.constants';

// AWS SDK v3
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class ChatService {
  private s3Client: S3Client;

  constructor(
    @Inject(DB_CONNECTION_POOL) private dbPool: Pool,
    private configService: ConfigService,
    private chatGateway: ChatGateway,
  ) {
    // Initialize S3 client
    this.s3Client = new S3Client({
      region: this.configService.get<string>('AWS_REGION'),
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID') || '',
        secretAccessKey:
          this.configService.get<string>('AWS_SECRET_ACCESS_KEY') || '',
      },
    });
  }

  async getChatMessages(
    topicId: number,
    limit: number,
    offset: number,
    baseUrl: string,
  ): Promise<any[]> {
    try {
      const [rows]: any = await this.dbPool.query(
        `
        SELECT c.id, c.content, c.created_at, u.nickname, u.profile_image_url
        FROM tn_chat c
        JOIN tn_user u ON c.user_id = u.id
        WHERE c.topic_id = ? AND c.status = 'ACTIVE'
        ORDER BY c.created_at DESC
        LIMIT ?
        OFFSET ?
      `,
        [topicId, limit, offset],
      );

      // 각 메시지에 대해 기사 및 토픽 정보 추출
      const messagesWithPreviews = await Promise.all(
        rows.map(async (msg: any) => {
          const articlePreview = await extractArticlePreview(
            this.dbPool,
            msg.content,
          );
          const topicPreview = await extractTopicPreview(
            this.dbPool,
            msg.content,
          );
          return {
            ...msg,
            profile_image_url: msg.profile_image_url
              ? `${baseUrl}${msg.profile_image_url}`
              : null,
            article_preview: articlePreview,
            topic_preview: topicPreview,
          };
        }),
      );

      return messagesWithPreviews;
    } catch (error) {
      console.error('Error fetching chat messages:', error);
      throw new InternalServerErrorException(
        '채팅 메시지를 불러오는 중 오류가 발생했습니다.',
      );
    }
  }

  async createChatMessage(
    topicId: number,
    userId: number,
    content: string,
    baseUrl: string,
  ): Promise<any> {
    const connection: PoolConnection = await this.dbPool.getConnection();
    try {
      await connection.beginTransaction();

      // Insert the new message
      const [insertResult]: any = await connection.query(
        'INSERT INTO tn_chat (topic_id, user_id, content) VALUES (?, ?, ?)',
        [topicId, userId, content.trim()],
      );
      const newMessageId = insertResult.insertId;

      // Fetch the newly created message with user info
      const [rows]: any = await connection.query(
        `SELECT c.id, c.content as message, c.created_at, u.nickname as author, u.profile_image_url 
         FROM tn_chat c 
         JOIN tn_user u ON c.user_id = u.id 
         WHERE c.id = ?`,
        [newMessageId],
      );
      const newMessage = rows[0];

      // Convert profile_image_url to absolute URL
      if (newMessage.profile_image_url) {
        newMessage.profile_image_url = `${baseUrl}${newMessage.profile_image_url}`;
      }

      // Extract article and topic preview from the content
      const articlePreview = await extractArticlePreview(
        connection,
        content.trim(),
      );
      const topicPreview = await extractTopicPreview(
        connection,
        content.trim(),
      );

      if (articlePreview) {
        newMessage.article_preview = articlePreview;
      }
      if (topicPreview) {
        newMessage.topic_preview = topicPreview;
      }

      await connection.commit();

      // Socket.IO 실시간 전송
      this.chatGateway.emitNewMessage(topicId, newMessage);

      return newMessage;
    } catch (error) {
      await connection.rollback();
      console.error('Error posting new message:', error);
      throw new InternalServerErrorException(
        '메시지를 전송하는 중 오류가 발생했습니다.',
      );
    } finally {
      connection.release();
    }
  }

  async deleteChatMessage(messageId: number, userId: number): Promise<any> {
    try {
      const [messages]: any = await this.dbPool.query(
        'SELECT user_id FROM tn_chat WHERE id = ?',
        [messageId],
      );

      if (messages.length === 0) {
        throw new NotFoundException('메시지를 찾을 수 없습니다.');
      }

      if (messages[0].user_id !== userId) {
        throw new ForbiddenException('메시지를 삭제할 권한이 없습니다.');
      }

      await this.dbPool.query(
        "UPDATE tn_chat SET status = 'DELETED_BY_USER' WHERE id = ?",
        [messageId],
      );

      return { message: '메시지가 삭제되었습니다.' };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      console.error('Error deleting message:', error);
      throw new InternalServerErrorException(
        '메시지를 삭제하는 중 오류가 발생했습니다.',
      );
    }
  }

  async reportChatMessage(
    messageId: number,
    userId: number,
    reason?: string,
  ): Promise<any> {
    const REPORT_THRESHOLD = 5;

    try {
      // 1. Try to log the report first
      const [logResult]: any = await this.dbPool.query(
        'INSERT IGNORE INTO tn_chat_report_log (chat_id, user_id, reason) VALUES (?, ?, ?)',
        [messageId, userId, reason || null],
      );

      // 2. If affectedRows is 0, it was a duplicate
      if (logResult.affectedRows === 0) {
        return { message: '이미 신고한 메시지입니다.' };
      }

      // 3. If it's a new report, run the transactional updates
      const connection: PoolConnection = await this.dbPool.getConnection();
      try {
        await connection.beginTransaction();

        // Increment report count
        await connection.query(
          'UPDATE tn_chat SET report_count = report_count + 1 WHERE id = ?',
          [messageId],
        );

        // Check if report count exceeds threshold
        const [messages]: any = await connection.query(
          'SELECT user_id, report_count, topic_id FROM tn_chat WHERE id = ?',
          [messageId],
        );
        const message = messages[0];

        if (message && message.report_count >= REPORT_THRESHOLD) {
          // Hide the message
          await connection.query(
            "UPDATE tn_chat SET status = 'HIDDEN' WHERE id = ?",
            [messageId],
          );
          
          // Increment user's warning count
          const messageAuthorId = message.user_id;
          await connection.query(
            'UPDATE tn_user SET warning_count = warning_count + 1 WHERE id = ?',
            [messageAuthorId],
          );

          // Notify clients via gateway
          this.chatGateway.emitMessageHidden(message.topic_id, messageId);
        }

        await connection.commit();
        return { message: '신고가 접수되었습니다.' };
      } catch (error) {
        await connection.rollback();
        console.error('Error processing report consequences:', error);
        throw new InternalServerErrorException(
          '신고를 처리하는 중 오류가 발생했습니다.',
        );
      } finally {
        connection.release();
      }
    } catch (error) {
      if (error instanceof InternalServerErrorException) throw error;
      console.error('Error logging report:', error);
      throw new InternalServerErrorException(
        '신고를 기록하는 중 오류가 발생했습니다.',
      );
    }
  }

  async createPresignedUrl(
    fileName: string,
    fileType: string,
  ): Promise<{ uploadUrl: string; fileUrl: string }> {
    const fileKey = `chats/${uuidv4()}-${fileName}`;
    const bucketName = this.configService.get<string>('AWS_S3_BUCKET_NAME');
    const region = this.configService.get<string>('AWS_REGION');

    if (!bucketName) {
      console.error('AWS_S3_BUCKET_NAME is not set in environment variables.');
      throw new InternalServerErrorException('Server configuration error.');
    }

    try {
      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: fileKey,
        ContentType: fileType,
        ACL: 'public-read',
      });

      const uploadUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn: 60,
      }); // 1 minute
      const fileUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${fileKey}`;

      return { uploadUrl, fileUrl };
    } catch (error) {
      console.error('Error creating presigned URL:', error);
      throw new InternalServerErrorException('Could not create presigned URL');
    }
  }
}
