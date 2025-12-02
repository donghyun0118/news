import {
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { Pool } from 'mysql2/promise';
import { ChatGateway, userSocketMap } from '../chat/chat.gateway';
import { DB_CONNECTION_POOL } from '../database/database.constants';
import { NotificationType } from './dto/send-notification.dto';

interface UserToNotify {
  user_id: number;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @Inject(DB_CONNECTION_POOL) private dbPool: Pool,
    private readonly chatGateway: ChatGateway,
  ) {}

  private getNotificationMessage(
    type: NotificationType,
    data: Record<string, any>,
  ): { message: string; url: string } {
    switch (type) {
      case NotificationType.NEW_TOPIC:
        return {
          message: `새로운 토픽이 도착했습니다: ${data.title}`,
          url: `/debate/${data.id}`,
        };
      case NotificationType.BREAKING_NEWS:
      case NotificationType.EXCLUSIVE_NEWS:
        return {
          message: `[${data.source}] ${data.title}`,
          url: data.url,
        };
      default:
        return { message: '새로운 알림이 도착했습니다.', url: '/' };
    }
  }

  async sendNotificationToUser(
    userId: number,
    type: NotificationType,
    data: Record<string, any>,
  ): Promise<void> {
    const { message, url } = this.getNotificationMessage(type, data);

    try {
      // 1. Insert notification into DB
      await this.dbPool.query(
        'INSERT INTO tn_notification (user_id, type, message, related_url) VALUES (?, ?, ?, ?)',
        [userId, type, message, url],
      );
      this.logger.log(`Inserted notification for user ${userId} into DB.`);

      // 2. Emit real-time notification
      const socketId = userSocketMap.get(userId);
      if (socketId) {
        this.chatGateway.server.to(socketId).emit('new_notification', {
          type,
          message,
          related_url: url,
        });
        this.logger.log(`Sent real-time notification to user ${userId}.`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to send notification to user ${userId}:`,
        error,
      );
    }
  }

  async sendNotificationToAll(
    type: NotificationType,
    data: Record<string, any>,
  ): Promise<void> {
    const { message, url } = this.getNotificationMessage(type, data);
    const settingKey = `${type.toLowerCase()}_notification`; // e.g., 'new_topic_notification'

    try {
      // 1. Fetch users who have opted-in for this notification type
      const [usersToNotify]: any = await this.dbPool.query(
        `SELECT user_id FROM tn_user_notification_settings WHERE ?? = 1`,
        [settingKey],
      );

      if (usersToNotify.length === 0) {
        this.logger.log(`No users to notify for type: ${type}`);
        return;
      }

      const userIds = usersToNotify.map((u: UserToNotify) => u.user_id);

      // 2. Batch insert notifications into the database
      const notifications = userIds.map((userId: number) => [
        userId,
        type,
        message,
        url,
      ]);
      await this.dbPool.query(
        'INSERT INTO tn_notification (user_id, type, message, related_url) VALUES ?',
        [notifications],
      );
      this.logger.log(
        `Inserted ${notifications.length} notifications into DB for type ${type}.`,
      );

      // 3. Emit real-time notifications to connected users
      let onlineUsers = 0;
      for (const userId of userIds) {
        const socketId = userSocketMap.get(userId);
        if (socketId) {
          this.chatGateway.server.to(socketId).emit('new_notification', {
            type,
            message,
            related_url: url,
          });
          onlineUsers++;
        }
      }
      this.logger.log(
        `Sent real-time notifications to ${onlineUsers} online users.`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send notifications for type ${type}:`,
        error,
      );
      // We don't throw an exception because this is a background task
    }
  }

  async getNotifications(
    userId: number,
    page: number,
    limit: number,
  ): Promise<any> {
    const offset = (page - 1) * limit;

    try {
      const [rows]: any = await this.dbPool.query(
        `SELECT id, type, message, related_url, is_read, created_at 
         FROM tn_notification 
         WHERE user_id = ? 
         ORDER BY created_at DESC 
         LIMIT ? OFFSET ?`,
        [userId, limit, offset],
      );

      const [countRows]: any = await this.dbPool.query(
        'SELECT COUNT(*) as total FROM tn_notification WHERE user_id = ?',
        [userId],
      );
      const total = countRows[0].total;

      const [unreadRows]: any = await this.dbPool.query(
        'SELECT COUNT(*) as unread_count FROM tn_notification WHERE user_id = ? AND is_read = 0',
        [userId],
      );
      const unreadCount = unreadRows[0].unread_count;

      return {
        notifications: rows.map((row: any) => ({
          ...row,
          is_read: Boolean(row.is_read),
        })),
        total,
        unread_count: unreadCount,
        page,
        limit,
      };
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw new InternalServerErrorException('Server error');
    }
  }

  async getUnreadCount(userId: number): Promise<any> {
    try {
      const [rows]: any = await this.dbPool.query(
        'SELECT COUNT(*) as unread_count FROM tn_notification WHERE user_id = ? AND is_read = 0',
        [userId],
      );
      return { unread_count: rows[0].unread_count };
    } catch (error) {
      console.error('Error fetching unread count:', error);
      throw new InternalServerErrorException('Server error');
    }
  }

  async markAsRead(notificationId: number, userId: number): Promise<any> {
    try {
      const [result]: any = await this.dbPool.query(
        'UPDATE tn_notification SET is_read = 1 WHERE id = ? AND user_id = ?',
        [notificationId, userId],
      );

      if (result.affectedRows === 0) {
        throw new NotFoundException('Notification not found or already read.');
      }

      return {
        message: 'Notification marked as read.',
        notification_id: notificationId,
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      console.error('Error marking notification as read:', error);
      throw new InternalServerErrorException('Server error');
    }
  }

  async markAllAsRead(userId: number): Promise<any> {
    try {
      const [result]: any = await this.dbPool.query(
        'UPDATE tn_notification SET is_read = 1 WHERE user_id = ? AND is_read = 0',
        [userId],
      );

      return {
        message: 'All notifications marked as read.',
        updated_count: result.affectedRows,
      };
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw new InternalServerErrorException('Server error');
    }
  }

  async deleteNotification(
    notificationId: number,
    userId: number,
  ): Promise<any> {
    try {
      const [result]: any = await this.dbPool.query(
        'DELETE FROM tn_notification WHERE id = ? AND user_id = ?',
        [notificationId, userId],
      );

      if (result.affectedRows === 0) {
        throw new NotFoundException('Notification not found.');
      }

      return { message: 'Notification deleted successfully.' };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      console.error('Error deleting notification:', error);
      throw new InternalServerErrorException('Server error');
    }
  }
}
