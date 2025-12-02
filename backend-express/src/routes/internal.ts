import express, { Request, Response } from "express";
import { RowDataPacket } from "mysql2";
import { NotificationService } from "../services/notificationService";

const router = express.Router();

interface UserToNotify extends RowDataPacket {
  id: number;
}

/**
 * @swagger
 * /api/internal/send-notification:
 *   post:
 *     tags: [Internal]
 *     summary: (내부용) 조건부 실시간 알림 발송
 *     description: "내부 시스템(예: Python 스크립트)에서 이 API를 호출하여, 특정 사용자 그룹에게 실시간 알림을 보냅니다."
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [notification_type, data]
 *             properties:
 *               notification_type:
 *                 type: string
 *                 enum: [NEW_TOPIC, BREAKING_NEWS, EXCLUSIVE_NEWS]
 *               data:
 *                 type: object
 *                 description: "알림에 포함될 데이터 객체"
 *     responses:
 *       202:
 *         description: "알림 발송 작업이 시작됨"
 *       400:
 *         description: "잘못된 요청 데이터"
 */
router.post("/send-notification", async (req: Request, res: Response) => {
  const { notification_type, data } = req.body;

  if (!notification_type || !data) {
    return res.status(400).json({ message: "notification_type and data are required." });
  }

  // 응답을 먼저 보내고, 알림 발송은 백그라운드에서 계속 진행
  res.status(202).json({ message: "Notification dispatch initiated." });

  // --- 백그라운드 알림 발송 로직 ---
  const io = req.app.get("io");
  // NotificationService 내부에서 io를 사용하여 소켓 전송 및 DB 저장을 모두 처리함

  try {
    const notificationService = NotificationService.getInstance();

    // data 객체를 템플릿 파라미터로 그대로 전달
    // BREAKING_NEWS, EXCLUSIVE_NEWS 템플릿은 { title, source, ... } 형태를 기대함
    const params = {
      title: data.title,
      source: data.source,
      source_domain: data.source_domain,
      thumbnail_url: data.thumbnail_url,
      published_at: data.published_at,
      url: data.url,
    };

    // sendToAllUsers는 내부적으로 설정(tn_user_notification_settings)을 확인하여
    // 수신 동의한 사용자에게만 DB 저장 및 소켓 전송을 수행함
    await notificationService.sendToAllUsers(notification_type, params, io);
  } catch (error) {
    console.error(`[Notification] Failed to send notifications for type ${notification_type}:`, error);
  }
});

export default router;
