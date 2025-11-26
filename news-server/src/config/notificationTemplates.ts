/**
 * 알림 메시지 템플릿
 *
 * 각 알림 타입별로 메시지 형식을 정의합니다.
 * 동적 값은 함수 형태로 제공되어 실제 값으로 치환됩니다.
 */

export enum NotificationType {
  NEW_TOPIC = "NEW_TOPIC",
  FRIEND_REQUEST = "FRIEND_REQUEST",
  VOTE_REMINDER = "VOTE_REMINDER",
  ADMIN_NOTICE = "ADMIN_NOTICE",
}

interface NotificationTemplate {
  getMessage: (params?: any) => string;
  getUrl?: (params?: any) => string | null;
}

export const NotificationTemplates: Record<NotificationType, NotificationTemplate> = {
  /**
   * 새 토픽 발행 알림
   * @param topicId - 토픽 ID
   * @param topicName - 토픽 이름
   */
  [NotificationType.NEW_TOPIC]: {
    getMessage: ({ topicName }: { topicName: string }) =>
      `🎯 새로운 토픽 '${topicName}'이(가) 시작되었습니다! 지금 참여해보세요.`,
    getUrl: ({ topicId }: { topicId: number }) => `/topics/${topicId}`,
  },

  /**
   * 친구 요청 알림 (향후 구현)
   * @param fromUserName - 요청 보낸 사용자 이름
   * @param requestId - 요청 ID
   */
  [NotificationType.FRIEND_REQUEST]: {
    getMessage: ({ fromUserName }: { fromUserName: string }) => `👥 ${fromUserName}님이 친구 요청을 보냈습니다.`,
    getUrl: ({ requestId }: { requestId: number }) => `/friends/requests/${requestId}`,
  },

  /**
   * 투표 독려 알림
   * @param topicName - 토픽 이름
   * @param topicId - 토픽 ID
   * @param hoursLeft - 남은 시간 (시간 단위)
   */
  [NotificationType.VOTE_REMINDER]: {
    getMessage: ({ topicName, hoursLeft }: { topicName: string; hoursLeft: number }) =>
      `⏰ '${topicName}' 토픽 투표 마감 ${hoursLeft}시간 전입니다. 아직 참여하지 않으셨다면 지금 투표하세요!`,
    getUrl: ({ topicId }: { topicId: number }) => `/topics/${topicId}`,
  },

  /**
   * 관리자 공지사항
   * 메시지는 관리자가 직접 작성하므로 템플릿 없음
   */
  [NotificationType.ADMIN_NOTICE]: {
    getMessage: ({ message }: { message: string }) => message,
    getUrl: ({ url }: { url?: string }) => url || null,
  },
};

/**
 * 알림 메시지 생성 헬퍼 함수
 *
 * @example
 * const message = createNotificationMessage(NotificationType.NEW_TOPIC, {
 *   topicName: 'AI vs 인간',
 *   topicId: 123
 * });
 * // "🎯 새로운 토픽 'AI vs 인간'이(가) 시작되었습니다! 지금 참여해보세요."
 */
export function createNotificationMessage(
  type: NotificationType,
  params: any
): { message: string; url: string | null } {
  const template = NotificationTemplates[type];

  if (!template) {
    throw new Error(`Unknown notification type: ${type}`);
  }

  const message = template.getMessage(params);
  const url = template.getUrl ? template.getUrl(params) : null;

  return { message, url };
}

/**
 * 샘플 데이터 (테스트 및 프론트엔드 개발용)
 */
export const NOTIFICATION_SAMPLES = [
  {
    type: NotificationType.NEW_TOPIC,
    params: { topicName: "이재명 vs 윤석열", topicId: 123 },
    expected: {
      message: "🎯 새로운 토픽 '이재명 vs 윤석열'이(가) 시작되었습니다! 지금 참여해보세요.",
      url: "/topics/123",
    },
  },
  {
    type: NotificationType.VOTE_REMINDER,
    params: { topicName: "AI vs 인간", topicId: 456, hoursLeft: 1 },
    expected: {
      message: "⏰ 'AI vs 인간' 토픽 투표 마감 1시간 전입니다. 아직 참여하지 않으셨다면 지금 투표하세요!",
      url: "/topics/456",
    },
  },
  {
    type: NotificationType.ADMIN_NOTICE,
    params: {
      message: "서버 점검이 예정되어 있습니다. (11/27 02:00 ~ 03:00)",
      url: "/announcements/maintenance",
    },
    expected: {
      message: "서버 점검이 예정되어 있습니다. (11/27 02:00 ~ 03:00)",
      url: "/announcements/maintenance",
    },
  },
];
