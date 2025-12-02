# 인증 및 사용자 관리 (Authentication & User Management)

## 1. 인증 (`src/auth`)

이 시스템은 무상태(Stateless) 인증을 위해 **JWT (JSON Web Token)**를 사용합니다.

### 전략 (Strategies)

- **Local Strategy**: 로그인에 사용됩니다. 이메일과 비밀번호를 검증합니다.
- **JWT Strategy**: API 엔드포인트 보호에 사용됩니다. `Authorization` 헤더(`Bearer <token>`)에서 토큰을 추출하고 검증합니다.

### 가드 (Guards)

- `JwtAuthGuard`: 로그인이 필요한 라우트를 보호합니다.
- `AdminGuard`: 인증된 사용자가 관리자 권한을 가지고 있는지 확인합니다.

### 흐름 (Flow)

1.  사용자가 `/api/auth/login`으로 자격 증명(이메일/비번)을 POST 요청합니다.
2.  `AuthService`가 `UsersService`를 통해 자격 증명을 검증합니다.
3.  유효한 경우, `USER_JWT_SECRET`으로 서명된 JWT를 반환합니다.
4.  클라이언트는 이후 요청에 이 토큰을 포함하여 보냅니다.

## 2. 사용자 관리 (`src/user`)

사용자 프로필, 가입 및 상태를 처리합니다.

### 데이터 모델 (`tn_user`)

- `id`: 기본 키 (Primary Key).
- `email`: 고유 식별자.
- `nickname`: 고유 표시 이름.
- `status`: `ACTIVE`(활성), `SUSPENDED`(정지), `DELETED`(삭제).
- `warning_count`: 커뮤니티 가이드라인 위반 횟수를 추적합니다.

### 주요 기능

- **회원가입**: 해시된 비밀번호(bcrypt)로 새 사용자를 생성합니다.
- **프로필**: 사용자 프로필(아바타, 닉네임)을 조회하고 업데이트합니다.
- **정지**: 관리자는 사용자를 정지시켜 로그인 및 상호 작용을 막을 수 있습니다.
