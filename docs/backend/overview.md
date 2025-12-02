# 백엔드 시스템 개요 (Backend System Overview)

## 1. 시스템 아키텍처

백엔드는 **NestJS**를 기반으로 구축되었으며, 효율적이고 확장 가능하며 유지보수가 용이하도록 설계되었습니다. 모듈식 아키텍처를 따르며 **MySQL** (TiDB)을 주 데이터베이스로 사용합니다.

### 핵심 구성 요소

- **API 서버**: REST API 및 WebSocket 연결을 처리하는 NestJS 애플리케이션입니다.
- **데이터베이스**: 사용자, 토픽, 기사 및 커뮤니티 데이터를 영구 저장하기 위한 MySQL (TiDB)입니다.
- **데이터 파이프라인**: RSS 피드를 통해 뉴스 기사를 수집하고 처리(임베딩, 클러스터링)하는 Python 스크립트(`backend/scripts`)입니다.
- **관리자 UI**: 백엔드와 상호 작용하여 관리 작업을 수행하는 별도의 React 애플리케이션(`frontend`)입니다.

## 2. 디렉토리 구조 (`backend/`)

백엔드 코드는 다음과 같이 구성됩니다.

- **`src/`**: 메인 애플리케이션 소스 코드입니다.
  - `admin/`: 플랫폼 관리를 위한 관리자 전용 모듈(컨트롤러, 서비스)입니다.
  - `auth/`: 인증 로직(JWT 전략, 가드)입니다.
  - `chat/`: Socket.IO를 사용한 실시간 채팅 기능입니다.
  - `common/`: 공통 유틸리티, 데코레이터 및 필터입니다.
  - `config/`: 구성 모듈(환경 변수)입니다.
  - `database/`: 데이터베이스 연결 및 공급자입니다.
  - `jobs/`: 작업 스케줄링 및 Python 스크립트 실행 관리입니다.
  - `notifications/`: 실시간 알림 전송 시스템입니다.
  - `topics/`, `articles/`, `comments/`: 기능별 모듈입니다.
  - `user/`: 사용자 관리 모듈입니다.
- **`scripts/`**: 데이터 작업을 위한 Python 스크립트입니다.
  - `rss_collector.py`: RSS 피드에서 기사를 수집합니다.
  - `vector_indexer.py`: 검색 및 유사도 분석을 위한 임베딩을 생성합니다.
  - `requirements.txt`: Python 의존성 목록입니다.

## 3. 주요 기술

- **프레임워크**: NestJS (TypeScript)
- **데이터베이스 드라이버**: `mysql2` (성능 및 제어를 위해 원시 SQL 쿼리 사용).
- **실시간 통신**: 채팅 및 라이브 업데이트를 위한 `socket.io`.
- **인증**: 안전한 무상태(Stateless) 인증을 위한 `passport`, `passport-jwt`.
- **문서화**: API 문서화를 위한 `@nestjs/swagger`.
- **컨테이너화**: 일관된 환경을 위한 Docker 및 Docker Compose.
