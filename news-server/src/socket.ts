import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import pool from "./config/db";

// 소켓에 사용자 정보를 추가하기 위한 타입 확장
interface AuthenticatedSocket extends Socket {
  user?: jwt.JwtPayload & { 
    userId: number;
    name: string;
    nickname: string;
    profile_image_url: string;
  };
}

// userId와 socket.id를 매핑하기 위한 인-메모리 맵
export const userSocketMap = new Map<number, string>();

const initializeSocket = (io: Server) => {

  // 소켓 미들웨어: 모든 연결에 대해 JWT 인증 수행
  io.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error("Authentication error: Token not provided"));
    }

    const jwtSecret = process.env.USER_JWT_SECRET || "default_fallback_secret";
    jwt.verify(token, jwtSecret, (err: any, decoded: any) => {
      if (err) {
        console.error("[Socket Auth] Invalid token:", err.message);
        return next(new Error("Authentication error: Invalid token"));
      }
      socket.user = decoded;
      next();
    });
  });

  io.on("connection", (socket: AuthenticatedSocket) => {
    const user = socket.user;
    if (!user) return; // Should not happen due to middleware

    console.log(`[Socket] Authenticated user connected: ${user.name} (${socket.id})`);
    // 사용자가 연결되면 맵에 추가
    userSocketMap.set(user.userId, socket.id);

    socket.on("join_room", (room: string) => {
      socket.join(room);
      console.log(`[Socket] User ${user.name} joined room: ${room}`);
    });

    socket.on("disconnect", () => {
      console.log(`[Socket] User ${user.name} disconnected: ${socket.id}`);
      // 사용자가 연결을 끊으면 맵에서 제거
      if (userSocketMap.get(user.userId) === socket.id) {
        userSocketMap.delete(user.userId);
      }
    });

    socket.on("error", (error) => {
      console.error(`[Socket] Error for user ${user.name}:`, error);
    });
  });
};

export default initializeSocket;
