# 검색 페이지 프론트엔드 구현 가이드

> 이 문서는 프론트엔드 개발자가 검색 페이지를 구현하는 데 필요한 API 명세와 UI 컴포넌트 예시를 제공합니다.

## 목차

1.  [API 명세](#1-api-명세)
2.  [UI 구현 예시](#2-ui-구현-예시)
    -   [전체 레이아웃](#21-전체-레이아웃)
    -   [관련 토픽 카드 (`TopicCard`)](#22-관련-토픽-카드-topiccard)
    -   [검색어 하이라이트](#23-검색어-하이라이트)
3.  [개발 참고사항](#3-개발-참고사항)

---

## 1. API 명세

### Endpoint

```http
GET /api/search
```

### 쿼리 파라미터

| 이름 | 타입   | 필수 | 설명         |
| ---- | ------ | ---- | ------------ |
| `q`  | string | O    | 검색할 키워드 |

**요청 예시:**

```
GET /api/search?q=이재명
```

### 응답 Body

**성공 (200 OK):**

```json
{
  "relatedTopics": [
    {
      "id": 123,
      "display_name": "이재명 대표, 차기 대권주자 지지율 1위",
      "published_at": "2025-11-28T10:00:00Z",
      "vote_end_at": "2025-12-05T23:59:59Z",
      "stance_left": "압도적인 지지, 당연한 결과",
      "stance_right": "시기상조, 여론조사 믿을 수 없어",
      "total_votes": 1204
    }
  ],
  "articles": [
    {
      "id": 456,
      "title": "[속보] 이재명 더불어민주당 대표, 국회 교섭단체 대표연설",
      "description": "이재명 대표는 오늘 국회에서...",
      "url": "https://example.com/news/123",
      "source": "뉴스라운드",
      "source_domain": "newsround.co.kr",
      "thumbnail_url": "https://example.com/thumbnail.jpg",
      "published_at": "2025-11-28T09:00:00Z",
      "favicon_url": "https://newsround.co.kr/favicon.ico"
    }
  ]
}
```

---

## 2. UI 구현 예시

### 2.1. 전체 레이아웃

검색 결과를 '관련 토픽'과 '관련 기사' 두 섹션으로 나누어 표시합니다.

```tsx
import { useState, useEffect } from "react";
import axios from "axios";
import { TopicCard } from "./TopicCard";
import { ArticleCard } from "./ArticleCard"; // 가정

const SearchResultsPage = ({ query }: { query: string }) => {
  const [data, setData] = useState<{ relatedTopics: any[]; articles: any[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!query) return;

    setLoading(true);
    axios
      .get(`/api/search?q=${query}`)
      .then((res) => setData(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [query]);

  if (loading) return <div>로딩 중...</div>;
  if (!data) return <div>검색 결과가 없습니다.</div>;

  return (
    <div className="search-results-container p-4">
      {/* 1. 관련 토픽 섹션 */}
      {data.relatedTopics.length > 0 && (
        <section className="related-topics mb-8">
          <h2 className="text-2xl font-bold mb-4">🗳️ 이 검색어와 관련된 토론 보기</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.relatedTopics.map((topic) => (
              <TopicCard key={topic.id} topic={topic} />
            ))}
          </div>
        </section>
      )}

      {/* 2. 관련 기사 목록 */}
      <section className="articles">
        <h2 className="text-xl font-semibold mb-4">뉴스 기사 ({data.articles.length}개)</h2>
        <div className="space-y-4">
          {data.articles.map((article) => (
            <ArticleCard key={article.id} article={article} searchQuery={query} />
          ))}
        </div>
      </section>
    </div>
  );
};
```

### 2.2. 관련 토픽 카드 (`TopicCard`)

API 응답에 추가된 `stance_left`, `stance_right`, `total_votes`를 활용하여 풍부한 정보를 제공합니다.

```tsx
import { useNavigate } from "react-router-dom";

// API 응답 데이터 타입 정의
interface TopicData {
  id: number;
  display_name: string;
  vote_end_at: string;
  stance_left: string;
  stance_right: string;
  total_votes: number;
}

const TopicCard = ({ topic }: { topic: TopicData }) => {
  const navigate = useNavigate();

  const handleNavigate = () => {
    navigate(`/topics/${topic.id}`);
  };

  return (
    <div
      className="border rounded-lg p-5 bg-white shadow-md hover:shadow-xl transition-shadow cursor-pointer flex flex-col justify-between"
      onClick={handleNavigate}
    >
      <div>
        <h3 className="text-xl font-bold mb-3 truncate">{topic.display_name}</h3>
        <div className="text-sm text-gray-600 space-y-2 mb-4">
          <p>"{topic.stance_left}" vs "{topic.stance_right}"</p>
        </div>
      </div>
      <div className="flex justify-between items-center text-xs text-gray-500">
        <span>총 {topic.total_votes.toLocaleString()}명 투표</span>
        <span>~{new Date(topic.vote_end_at).toLocaleDateString()}</span>
      </div>
    </div>
  );
};
```

### 2.3. 검색어 하이라이트

검색어와 일치하는 텍스트에 시각적 강조(예: bold, 배경색)를 적용하여 가독성을 높입니다.

**유틸리티 함수:**

```tsx
function HighlightedText({ text, keyword }: { text: string; keyword: string }) {
  if (!keyword.trim()) {
    return <>{text}</>;
  }

  // 정규식에 사용될 특수문자를 이스케이프 처리합니다.
  const escapedKeyword = keyword.replace(/[.*+?^${}()|[\\]/g, "\\$& ");
  const regex = new RegExp(`(${escapedKeyword})`, "gi");
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, index) =>
        regex.test(part) ? (
          <strong key={index} className="font-bold text-blue-600">
            {part}
          </strong>
        ) : (
          <span key={index}>{part}</span>
        )
      )}
    </>
  );
}
```

**사용 예시:**

```tsx
// ArticleCard 컴포넌트 내부에서 사용
<h2>
  <HighlightedText text={article.title} keyword={searchQuery} />
</h2>
```

---

## 3. 개발 참고사항

-   **특수문자 처리**: 검색어에 `+` `*` `?` 등 정규식 특수문자가 포함될 경우, 하이라이트 기능에서 오류가 발생할 수 있습니다. 반드시 이스케이프 처리해야 합니다.
-   **No Result 처리**: `relatedTopics` 와 `articles` 배열이 모두 비어있을 경우, "검색 결과가 없습니다."와 같은 안내 메시지를 표시하는 것이 좋습니다.
-   **성능 최적화**: 검색어 하이라이트와 같이 렌더링 비용이 큰 부분은 `useMemo` 훅을 사용하여 최적화하는 것을 권장합니다.
-   **네비게이션**: 사용자가 토픽 카드를 클릭하면 해당 토픽의 상세 페이지(예: `/topics/:id`)로 이동시켜야 합니다.