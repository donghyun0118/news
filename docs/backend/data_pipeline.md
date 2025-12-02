# 데이터 파이프라인 및 스크립트 (Data Pipeline & Scripts)

## 1. 개요

이 플랫폼은 뉴스 수집, 자연어 처리(NLP), 벡터 인덱싱과 같은 무거운 데이터 작업을 위해 Python 스크립트를 사용합니다. 이 스크립트들은 `backend/scripts/`에 위치합니다.

## 2. 주요 스크립트

### `rss_collector.py`

- **목적**: 등록된 RSS 피드에서 최신 뉴스를 가져옵니다.
- **출력**: 원본 기사를 `tn_home_article` (스테이징 테이블)에 저장합니다.

### `vector_indexer.py`

- **목적**: `sentence-transformers` (예: `intfloat/multilingual-e5-small`)를 사용하여 기사의 벡터 임베딩을 생성합니다.
- **용도**: 의미론적 검색 및 관련 기사 찾기를 가능하게 합니다.
- **최적화**: 호스팅 환경의 메모리 제약 내에서 작동하도록 더 작은 모델을 사용합니다.

### `popularity_calculator.py`

- **목적**: 토픽의 인기 점수를 계산합니다.
- **로직**: 점수 = 투표 수 + (댓글 수 \* 10) + 조회수.

## 3. 작업 스케줄링 (`src/jobs`)

NestJS 백엔드는 `JobsService`를 통해 이러한 스크립트를 조정합니다.

### 메커니즘

- **`spawn`**: Node.js의 `child_process.spawn`을 사용하여 Python 스크립트를 실행합니다.
- **환경**: 전용 Python 가상 환경(`venv`)을 사용하여 동일한 컨테이너/서버 내에서 실행됩니다.

### 트리거

- **예약됨**: Cron 작업 (예: 매일 수집).
- **수동**: API를 통한 관리자 트리거 (예: "최신 수집" 버튼).
