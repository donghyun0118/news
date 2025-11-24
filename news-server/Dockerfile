# syntax=docker/dockerfile:1.4   # BuildKit 캐시 사용 (Render 기본 활성화)

# -------------------------------------------------
# 1️⃣ Build stage – TypeScript 컴파일 + npm 캐시
# -------------------------------------------------
FROM node:22-alpine AS builder          
WORKDIR /app

# ① package.json·lock만 복사 → npm 캐시 레이어 활용
COPY package*.json ./
# npm 캐시 레이어 (빌드가 재실행돼도 재사용)
RUN --mount=type=cache,target=/root/.npm \
    npm ci --only=production            

# ② 전체 소스 복사 (src, tsconfig 등)
COPY . .

# ③ TypeScript 빌드 → dist/
RUN npm run build

# -------------------------------------------------
# 2️⃣ Runtime stage – 최소 이미지에 실행 파일만 복사
# -------------------------------------------------
FROM node:22-alpine AS runtime
WORKDIR /app

# 빌드된 결과만 복사
COPY --from=builder /app/dist ./dist
# 프로덕션 의존성만 재설치 (optional, 이미 빌드 단계에 포함했지만 명시적으로)
COPY package*.json ./
RUN npm ci --only=production

EXPOSE 3000
CMD ["node", "dist/app.js"]