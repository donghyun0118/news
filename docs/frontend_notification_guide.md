# 프론트엔드 알림 시스템 구현 가이드

## 📋 백엔드 구현 현황

### ✅ 완료된 기능

- **NotificationService**: 중앙화된 알림 발송 로직
- **사용자 설정 관리**: Opt-out 방식 (기본값 ON)
- **실시간 알림**: Socket.IO 기반
- **자동 발송**: 토픽 발행, 속보/단독 뉴스 감지
- **알림 CRUD**: 조회, 읽음, 삭제
- **메타데이터**: 속보/단독 뉴스용 파비콘, 썸네일, 발행시각

---

## 🔌 1. Socket.IO 클라이언트 설정

### 설치

```bash
npm install socket.io-client
```

### 초기화 (`src/services/socket.ts`)

```typescript
import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export const initSocket = (token: string) => {
  if (socket?.connected) return socket;

  socket = io(import.meta.env.VITE_API_URL || "http://localhost:4001", {
    auth: { token },
    transports: ["websocket", "polling"],
  });

  socket.on("connect", () => {
    console.log("Socket connected:", socket?.id);
  });

  socket.on("disconnect", () => {
    console.log("Socket disconnected");
  });

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  socket?.disconnect();
  socket = null;
};
```

### 로그인 시 연결 (`src/contexts/AuthContext.tsx` 등)

```typescript
import { initSocket, disconnectSocket } from "@/services/socket";

// 로그인 성공 후
const token = response.data.token;
localStorage.setItem("token", token);
initSocket(token);

// 로그아웃 시
disconnectSocket();
```

---

## 🔔 2. 알림 수신 및 상태 관리

### 알림 Context (`src/contexts/NotificationContext.tsx`)

```typescript
import { createContext, useContext, useEffect, useState } from "react";
import { getSocket } from "@/services/socket";
import axios from "axios";

interface Notification {
  id: number;
  type: string;
  message: string;
  related_url: string | null;
  is_read: boolean;
  created_at: string;
  metadata?: {
    source: string;
    source_domain: string;
    thumbnail_url: string;
    published_at: string;
  };
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  fetchNotifications: () => void;
  markAsRead: (id: number) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: number) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();

    const socket = getSocket();
    if (socket) {
      socket.on("new_notification", (notification) => {
        setNotifications((prev) => [notification, ...prev]);
        setUnreadCount((prev) => prev + 1);

        // 토스트/푸시 알림 표시
        showNotificationToast(notification);
      });
    }

    return () => {
      socket?.off("new_notification");
    };
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await axios.get("/api/notifications");
      setNotifications(res.data.notifications);
      setUnreadCount(res.data.unread_count);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const res = await axios.get("/api/notifications/unread-count");
      setUnreadCount(res.data.unread_count);
    } catch (error) {
      console.error("Failed to fetch unread count:", error);
    }
  };

  const markAsRead = async (id: number) => {
    try {
      await axios.post(`/api/notifications/${id}/read`);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await axios.post("/api/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  };

  const deleteNotification = async (id: number) => {
    try {
      await axios.delete(`/api/notifications/${id}`);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (error) {
      console.error("Failed to delete notification:", error);
    }
  };

  const showNotificationToast = (notification: Notification) => {
    // react-hot-toast, sonner 등 사용
    // toast(notification.message);
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        deleteNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error("useNotifications must be used within NotificationProvider");
  return context;
};
```

---

## 🎨 3. UI 컴포넌트 구현

### 알림 배지 (`src/components/NotificationBadge.tsx`)

```typescript
import { useNotifications } from "@/contexts/NotificationContext";

export const NotificationBadge = () => {
  const { unreadCount } = useNotifications();

  return (
    <div className="relative">
      <Bell size={24} />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </div>
  );
};
```

### 알림 목록 (`src/components/NotificationList.tsx`)

```typescript
import { useNotifications } from "@/contexts/NotificationContext";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

export const NotificationList = () => {
  const { notifications, markAsRead, markAllAsRead, deleteNotification } = useNotifications();

  const getFaviconUrl = (domain: string) => {
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  };

  const getRelativeTime = (date: string) => {
    return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ko });
  };

  return (
    <div className="max-h-96 overflow-y-auto">
      <div className="flex justify-between p-4">
        <h3>알림</h3>
        <button onClick={markAllAsRead}>모두 읽음</button>
      </div>

      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`p-4 border-b ${!notification.is_read ? "bg-blue-50" : ""}`}
          onClick={() => {
            if (!notification.is_read) markAsRead(notification.id);
            if (notification.related_url) {
              window.location.href = notification.related_url;
            }
          }}
        >
          {/* 속보/단독 뉴스의 경우 메타데이터 표시 */}
          {notification.metadata && (
            <div className="flex items-center gap-2 mb-2">
              <img
                src={getFaviconUrl(notification.metadata.source_domain)}
                alt={notification.metadata.source}
                className="w-4 h-4"
              />
              <span className="text-xs text-gray-500">{notification.metadata.source}</span>
              <span className="text-xs text-gray-400">· {getRelativeTime(notification.metadata.published_at)}</span>
            </div>
          )}

          {/* 메시지 */}
          <p className="whitespace-pre-line">{notification.message}</p>

          {/* 썸네일 (속보/단독) */}
          {notification.metadata?.thumbnail_url && (
            <img
              src={notification.metadata.thumbnail_url}
              alt="thumbnail"
              className="mt-2 w-full h-32 object-cover rounded"
            />
          )}

          {/* 삭제 버튼 */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              deleteNotification(notification.id);
            }}
            className="text-red-500 text-sm mt-2"
          >
            삭제
          </button>
        </div>
      ))}
    </div>
  );
};
```

---

## ⚙️ 4. 알림 설정 UI

### 알림 설정 페이지 (`src/pages/NotificationSettings.tsx`)

```typescript
import { useEffect, useState } from "react";
import axios from "axios";

interface NotificationSetting {
  notification_type: string;
  is_enabled: boolean;
}

const NOTIFICATION_LABELS: Record<string, string> = {
  NEW_TOPIC: "새로운 토픽",
  BREAKING_NEWS: "속보",
  EXCLUSIVE_NEWS: "단독 보도",
  VOTE_REMINDER: "투표 독려",
  ADMIN_NOTICE: "관리자 공지",
  FRIEND_REQUEST: "친구 요청",
};

export const NotificationSettings = () => {
  const [settings, setSettings] = useState<NotificationSetting[]>([]);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const res = await axios.get("/api/user/me/notification-settings");
    setSettings(res.data);
  };

  const toggleSetting = async (type: string, enabled: boolean) => {
    try {
      await axios.put("/api/user/me/notification-settings", [{ notification_type: type, is_enabled: enabled }]);
      setSettings((prev) => prev.map((s) => (s.notification_type === type ? { ...s, is_enabled: enabled } : s)));
    } catch (error) {
      console.error("Failed to update settings:", error);
    }
  };

  return (
    <div className="max-w-md mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">알림 설정</h2>
      {settings.map((setting) => (
        <div key={setting.notification_type} className="flex items-center justify-between py-3 border-b">
          <span>{NOTIFICATION_LABELS[setting.notification_type]}</span>
          <input
            type="checkbox"
            checked={setting.is_enabled}
            onChange={(e) => toggleSetting(setting.notification_type, e.target.checked)}
            className="w-5 h-5"
          />
        </div>
      ))}
    </div>
  );
};
```

---

## 📡 5. API 엔드포인트 정리

| Method | Endpoint                             | 설명                    |
| ------ | ------------------------------------ | ----------------------- |
| GET    | `/api/notifications`                 | 알림 목록 조회 (페이징) |
| GET    | `/api/notifications/unread-count`    | 읽지 않은 알림 개수     |
| POST   | `/api/notifications/:id/read`        | 특정 알림 읽음 처리     |
| POST   | `/api/notifications/read-all`        | 모든 알림 읽음 처리     |
| DELETE | `/api/notifications/:id`             | 알림 삭제               |
| GET    | `/api/user/me/notification-settings` | 내 알림 설정 조회       |
| PUT    | `/api/user/me/notification-settings` | 알림 설정 변경          |

---

## 🚀 구현 순서 (권장)

1. ✅ **Socket.IO 설정**: `socket.ts` 생성 및 로그인 연동
2. ✅ **Context 생성**: `NotificationContext.tsx` 생성
3. ✅ **App에 Provider 추가**: `<NotificationProvider>`로 감싸기
4. ✅ **배지 추가**: 헤더에 `<NotificationBadge />` 추가
5. ✅ **알림 드롭다운**: `<NotificationList />` 구현
6. ✅ **설정 페이지**: `/settings/notifications` 경로 추가
7. ✅ **DB 스키마 업데이트**: 위의 SQL 실행

---

## 🎯 추가 개선 사항 (선택)

- **푸시 알림**: Web Push API 사용
- **소리**: 알림 수신 시 알림음 재생
- **그룹화**: 같은 타입의 알림을 묶어서 표시
- **필터링**: 읽음/안읽음 필터
- **무한 스크롤**: 알림 목록 페이징
