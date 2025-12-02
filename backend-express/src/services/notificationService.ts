import { Pool } from "mysql2/promise";
import { Server } from "socket.io";
import pool from "../config/db";
import { createNotificationMessage, NotificationType } from "../config/notificationTemplates";

export class NotificationService {
  private static instance: NotificationService;
  private pool: Pool;

  private constructor() {
    this.pool = pool;
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * 특정 사용자에게 알림 발송
   */
  public async sendToUser(userId: number, type: NotificationType, params: any, io?: Server): Promise<void> {
    await this.sendToUsers([userId], type, params, io);
  }

  /**
   * 여러 사용자에게 알림 발송 (설정 확인 포함)
   */
  public async sendToUsers(userIds: number[], type: NotificationType, params: any, io?: Server): Promise<void> {
    if (userIds.length === 0) return;

    try {
      // 1. 알림 수신 설정 확인 (해당 타입의 알림을 끈 사용자 제외)
      // tn_user_notification_settings에 레코드가 없으면 기본값(true)으로 간주하므로,
      // 'is_enabled = 0'인 사용자만 제외하면 됩니다.
      const [optOutRows]: any = await this.pool.query(
        "SELECT user_id FROM tn_user_notification_settings WHERE notification_type = ? AND is_enabled = 0 AND user_id IN (?)",
        [type, userIds]
      );

      const optOutUserIds = new Set(optOutRows.map((row: any) => row.user_id));
      const targetUserIds = userIds.filter((id) => !optOutUserIds.has(id));

      if (targetUserIds.length === 0) return;

      // 2. 메시지 생성
      const { message, url } = createNotificationMessage(type, params);

      // 3. DB Bulk Insert
      const values = targetUserIds.map((id) => [id, type, message, url, 0]);
      await this.pool.query("INSERT INTO tn_notification (user_id, type, message, related_url, is_read) VALUES ?", [
        values,
      ]);

      // 4. Socket.IO 실시간 전송
      if (io) {
        const notificationPayload: any = {
          type,
          message,
          related_url: url,
          created_at: new Date(),
          is_read: false,
        };

        // 속보/단독 뉴스의 경우 프론트엔드 표시용 메타데이터 추가
        if (type === NotificationType.BREAKING_NEWS || type === NotificationType.EXCLUSIVE_NEWS) {
          notificationPayload.metadata = {
            source: params.source,
            source_domain: params.source_domain,
            thumbnail_url: params.thumbnail_url,
            published_at: params.published_at,
          };
        }

        // userSocketMap은 app.ts에서 설정되었으므로, 각 userId별 룸으로 전송
        // (실제 구현은 socket.ts의 구조에 따라 다를 수 있음)
        for (const userId of targetUserIds) {
          io.to(userId.toString()).emit("new_notification", notificationPayload);
        }
      }

      console.log(`[Notification] Sent ${type} to ${targetUserIds.length} users.`);
    } catch (error) {
      console.error("[NotificationService] Error sending notifications:", error);
      throw error;
    }
  }

  /**
   * 모든 사용자에게 알림 발송 (설정 확인 포함)
   */
  public async sendToAllUsers(type: NotificationType, params: any, io?: Server): Promise<void> {
    try {
      // 1. 전체 사용자 ID 조회
      const [users]: any = await this.pool.query("SELECT id FROM tn_user WHERE status = 'ACTIVE'");
      const allUserIds = users.map((u: any) => u.id);

      await this.sendToUsers(allUserIds, type, params, io);
    } catch (error) {
      console.error("[NotificationService] Error sending to all users:", error);
      throw error;
    }
  }
}
