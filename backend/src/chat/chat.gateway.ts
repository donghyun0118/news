import { Logger, UseGuards } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import type { AuthenticatedSocket } from '../auth/ws.guard'; // Use import type
import { WsAuthGuard } from '../auth/ws.guard';

// userId와 socket.id를 매핑하기 위한 인-메모리 맵
export const userSocketMap = new Map<number, string>();

@UseGuards(WsAuthGuard)
@WebSocketGateway({
  cors: {
    origin: '*', // 프론트엔드 도메인으로 변경 가능
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger = new Logger('ChatGateway');

  // 클라이언트 연결 시
  handleConnection(client: AuthenticatedSocket) {
    const user = client.user;
    if (!user) return; // Guard should prevent this

    this.logger.log(`[Socket] Auth OK, client connected: ${user.nickname} (${client.id})`);
    userSocketMap.set(user.userId, client.id);
  }

  // 클라이언트 연결 해제 시
  handleDisconnect(client: AuthenticatedSocket) {
    const user = client.user;
    if (!user) { // 유저 정보가 없으면 일반 로그만 남김
      this.logger.log(`Client disconnected: ${client.id}`);
      return;
    }

    this.logger.log(`[Socket] Client disconnected: ${user.nickname} (${client.id})`);
    // 사용자가 연결을 끊으면 맵에서 제거
    if (userSocketMap.get(user.userId) === client.id) {
      userSocketMap.delete(user.userId);
    }
    
    // 클라이언트가 속해있던 모든 방에 대해 인원 수 업데이트
    client.rooms.forEach((room) => {
      // room 이름이 topic-으로 시작하는 경우에만 처리
      if (room.startsWith('topic-')) {
        // 방 이름에서 topicId 추출 (예: "topic-123" -> "123")
        const topicId = parseInt(room.split('-')[1], 10);
        if (!isNaN(topicId)) {
          // 약간의 딜레이를 주어 leave가 처리된 후 인원 수를 계산
          setTimeout(() => this.emitUserCount(topicId), 100);
        }
      }
    });
  }

  // 토픽 방 입장
  @SubscribeMessage('join_topic')
  handleJoinTopic(client: AuthenticatedSocket, topicId: number) {
    const room = `topic-${topicId}`;
    client.join(room);
    this.logger.log(`Client ${client.user!.nickname} joined ${room}`); // Non-null assertion
    this.emitUserCount(topicId); // 인원 수 브로드캐스트
    return { event: 'joined', topicId };
  }

  // 토픽 방 퇴장
  @SubscribeMessage('leave_topic')
  handleLeaveTopic(client: AuthenticatedSocket, topicId: number) {
    const room = `topic-${topicId}`;
    client.leave(room);
    this.logger.log(`Client ${client.user!.nickname} left ${room}`); // Non-null assertion
    this.emitUserCount(topicId); // 인원 수 브로드캐스트
    return { event: 'left', topicId };
  }

  // 특정 토픽 방의 현재 인원 수를 브로드캐스트
  emitUserCount(topicId: number) {
    const room = `topic-${topicId}`;
    const roomSize = this.server.sockets.adapter.rooms.get(room)?.size || 0;
    this.server.to(room).emit('user_count', roomSize);
    this.logger.log(`Emitted user count (${roomSize}) to ${room}`);
  }

  // 새 메시지를 특정 토픽 방에 브로드캐스트
  emitNewMessage(topicId: number, message: any) {
    this.server.to(`topic-${topicId}`).emit('receive_message', message);
    this.logger.log(`Emitted new message to topic-${topicId}`);
  }

  // 메시지 숨김을 특정 토픽 방에 브로드캐스트
  emitMessageHidden(topicId: number, messageId: number) {
    this.server.to(`topic-${topicId}`).emit('message_hidden', { messageId });
    this.logger.log(
      `Emitted message hidden for messageId: ${messageId} in topic-${topicId}`,
    );
  }
}
