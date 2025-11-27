# 알림 시스템 문서 (Notification System)

## 1. 개요

이 문서는 `NotificationService`를 통해 중앙화된 알림 시스템의 데이터 흐름과 구조를 설명합니다.

## 2. 데이터베이스 스키마 변경

`tn_notification` 테이블의 `type` 컬럼에 새로운 알림 유형이 추가되어야 합니다.

### 필요한 SQL 명령

```sql
ALTER TABLE tn_notification
MODIFY COLUMN type ENUM('NEW_TOPIC','FRIEND_REQUEST','VOTE_REMINDER','ADMIN_NOTICE','BREAKING_NEWS','EXCLUSIVE_NEWS') NOT NULL;
```

> **참고**: `tn_user_notification_settings` 테이블은 이미 `BREAKING_NEWS`, `EXCLUSIVE_NEWS`를 포함하고 있어 변경할 필요가 없습니다.

## 3. 알림 흐름 (Notification Flow)

### Flow A: 토픽 발행 시 자동 알림 (Automatic)

1.  **Trigger**: 관리자가 관리자 페이지에서 토픽 상태를 `OPEN`으로 변경 (발행).
2.  **API Call**: `PATCH /api/admin/topics/:topicId/publish` 요청 발생.
3.  **Server Logic** (`admin.ts`):
    - DB에서 토픽 상태 업데이트 (`PREPARING` -> `OPEN`).
    - 업데이트 성공 시 `NotificationService.sendToAllUsers(NotificationType.NEW_TOPIC, ...)` 호출.
4.  **NotificationService**:
    - `tn_user_notification_settings`를 조회하여 `NEW_TOPIC` 알림을 끈 사용자를 제외.
    - `tn_notification` 테이블에 알림 데이터 Bulk Insert.
    - Socket.IO를 통해 접속 중인 사용자에게 실시간 `new_notification` 이벤트 전송.

### Flow B: 관리자 수동 알림 / 속보 발송 (Manual)

1.  **Trigger**: 관리자가 '알림 발송' 페이지에서 템플릿(예: 속보) 선택 후 발송.
2.  **API Call**: `POST /api/admin/notifications` 요청 발생.
    - Payload: `{ message: "...", type: "BREAKING_NEWS", ... }`
3.  **Server Logic** (`admin.ts`):
    - 요청받은 `type`이 유효한지 확인 (기본값: `ADMIN_NOTICE`).
    - `NotificationService.sendToAllUsers(type, ...)` 호출.
4.  **NotificationService**:
    - `tn_user_notification_settings`를 조회하여 해당 타입(`BREAKING_NEWS`) 알림을 끈 사용자를 제외.
    - `tn_notification` 테이블에 저장 및 소켓 전송.

## 4. 주요 파일 및 역할

- **`services/notificationService.ts`**: 알림 발송의 핵심 로직 (DB 저장 + 소켓 전송 + 유저 설정 필터링).
- **`config/notificationTemplates.ts`**: 알림 유형(`Enum`) 정의 및 메시지 템플릿 관리.
- **`routes/admin.ts`**: 알림 발송의 진입점 (API 라우터).
- **`routes/user.ts`**: 사용자별 알림 설정(`tn_user_notification_settings`) 조회 및 수정 API.
