# 기사 저장/삭제 API 변경 가이드 (v2)

기존에 토픽에 포함된 기사(`tn_article`)만 저장 가능했던 기능이 모든 기사(`tn_home_article` 포함)를 저장할 수 있도록 확장되었습니다.
이에 따라 프론트엔드에서는 기사 저장/삭제 요청 시 **어떤 종류의 기사인지**를 백엔드에 알려주어야 합니다.

## 핵심 변경사항

기사 저장/삭제 API 호출 시, 해당 기사가 '토픽 기사'인지 '일반 기사(홈 기사)'인지를 `articleType` 파라미터로 명시해야 합니다.

- **`articleType: 'topic'`**: 토픽 상세 페이지 등에서 노출되는, 토픽에 소속된 기사 (`tn_article`)
- **`articleType: 'home'`**: 홈페이지, 검색 결과, 카테고리별 목록 등 일반적인 기사 목록에 노출되는 기사 (`tn_home_article`)

프론트엔드에서는 API로부터 기사 데이터를 받을 때, 이 기사가 어떤 종류인지 (`articleType`) 구분할 수 있는 정보가 함께 제공되어야 합니다. (백엔드 API 응답에 `articleType` 필드 추가 필요)

---

## 엔드포인트 상세

### 1. 기사 저장

- **Endpoint:** `POST /api/articles/{articleId}/save`
- **`articleId` (Path Parameter):** 저장하려는 기사의 고유 ID (e.g., `54321`)
- **Request Body:** `articleType`을 포함한 JSON 객체를 전송해야 합니다.

**요청 본문 (Request Body) 형식:**

```json
{
  "articleType": "home"
}
```

또는

```json
{
  "articleType": "topic"
}
```

**호출 예시:**
```javascript
// 예시: 일반 기사를 저장할 경우
const articleId = 8910;
const response = await apiClient.post(`/api/articles/${articleId}/save`, {
  articleType: 'home' 
});

// 예시: 토픽 기사를 저장할 경우
const topicArticleId = 567;
const response = await apiClient.post(`/api/articles/${topicArticleId}/save`, {
  articleType: 'topic' 
});
```

---

### 2. 기사 저장 취소

- **Endpoint:** `DELETE /api/articles/{articleId}/save`
- **`articleId` (Path Parameter):** 저장 취소하려는 기사의 고유 ID (e.g., `54321`)
- **Query Parameter:** `articleType`을 쿼리 스트링으로 반드시 포함해야 합니다.

**호출 URL 예시:**

`/api/articles/12345/save?articleType=home`

**호출 예시:**
```javascript
// 예시: 일반 기사를 저장 취소할 경우
const articleId = 8910;
const response = await apiClient.delete(`/api/articles/${articleId}/save?articleType=home`);

// 예시: 토픽 기사를 저장 취소할 경우
const topicArticleId = 567;
const response = await apiClient.delete(`/api/articles/${topicArticleId}/save?articleType=topic`);
```

## 프론트엔드 상태 관리 제안

- 각 기사 객체를 상태(state)로 관리할 때, 해당 기사의 `id`와 `articleType`을 항상 함께 관리해야 합니다.
- 사용자가 '저장' 버튼을 누르면, 현재 기사 객체에 포함된 `id`와 `articleType`을 조합하여 위 가이드에 맞는 API를 호출합니다.

**상태 객체 구조 예시:**
```typescript
interface Article {
  id: number;
  title: string;
  // ... 기타 기사 데이터
  articleType: 'home' | 'topic'; // 백엔드에서 내려주는 값
}
```
