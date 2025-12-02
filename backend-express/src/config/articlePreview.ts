import pool from "./db";

/**
 * 메시지에서 URL 추출 및 기사 정보 조회
 */

/**
 * 메시지 텍스트에서 URL 추출
 */
export function extractUrls(text: string): string[] {
  const urlRegex = /https?:\/\/[^\s]+/g;
  return text.match(urlRegex) || [];
}

/**
 * URL로 기사 정보 조회 (tn_article 또는 tn_home_article)
 */
export async function getArticleByUrl(url: string): Promise<any | null> {
  try {
    // 1. tn_article에서 먼저 검색 (토픽 큐레이션 기사)
    const [articleRows]: any = await pool.query(
      `SELECT id, title, source, source_domain, thumbnail_url, url
       FROM tn_article 
       WHERE url = ? AND status = 'published'
       LIMIT 1`,
      [url]
    );

    if (articleRows.length > 0) {
      const article = articleRows[0];
      // 파비콘 URL 추가
      article.favicon_url = article.source_domain
        ? `https://www.google.com/s2/favicons?domain=${article.source_domain}&sz=32`
        : null;
      return article;
    }

    // 2. tn_home_article에서 검색 (홈 화면 기사)
    const [homeArticleRows]: any = await pool.query(
      `SELECT id, title, source, source_domain, thumbnail_url, url
       FROM tn_home_article 
       WHERE url = ?
       LIMIT 1`,
      [url]
    );

    if (homeArticleRows.length > 0) {
      const article = homeArticleRows[0];
      // 파비콘 URL 추가
      article.favicon_url = article.source_domain
        ? `https://www.google.com/s2/favicons?domain=${article.source_domain}&sz=32`
        : null;
      return article;
    }

    return null;
  } catch (error) {
    console.error("Error fetching article by URL:", error);
    return null;
  }
}

/**
 * 메시지 텍스트에서 기사 정보 추출
 */
export async function extractArticlePreview(content: string): Promise<any | null> {
  const urls = extractUrls(content);

  if (urls.length === 0) {
    return null;
  }

  // 첫 번째 URL만 처리 (여러 개 있으면 첫 번째만)
  const firstUrl = urls[0];
  const article = await getArticleByUrl(firstUrl);

  return article;
}

/**
 * URL 또는 텍스트에서 토픽 ID 추출
 * 형식: /debate/{topicId}, /topics/{topicId}, https://.../debate/{topicId}
 */
export function extractTopicId(text: string): number | null {
  // URL에서 /debate/123 또는 /topics/123 패턴 찾기
  const debatePattern = /\/debate\/(\d+)/;
  const topicPattern = /\/topics\/(\d+)/;

  const debateMatch = text.match(debatePattern);
  if (debateMatch) {
    return parseInt(debateMatch[1], 10);
  }

  const topicMatch = text.match(topicPattern);
  if (topicMatch) {
    return parseInt(topicMatch[1], 10);
  }

  return null;
}

/**
 * 토픽 ID로 토픽 정보 조회
 */
export async function getTopicById(topicId: number): Promise<any | null> {
  try {
    const [topicRows]: any = await pool.query(
      `SELECT id, display_name, status, vote_end_at,
              (SELECT COUNT(*) FROM tn_topic_vote WHERE topic_id = ? AND side = 'LEFT') as left_count,
              (SELECT COUNT(*) FROM tn_topic_vote WHERE topic_id = ? AND side = 'RIGHT') as right_count
       FROM tn_topic 
       WHERE id = ? AND status IN ('OPEN', 'ROUND2', 'CLOSED')
       LIMIT 1`,
      [topicId, topicId, topicId]
    );

    if (topicRows.length > 0) {
      const topic = topicRows[0];
      
      // 남은 투표 시간 계산
      if (topic.vote_end_at) {
        const now = new Date();
        const endTime = new Date(topic.vote_end_at);
        const diff = endTime.getTime() - now.getTime();

        if (diff > 0) {
          const hours = Math.floor(diff / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((diff % (1000 * 60)) / 1000);
          topic.vote_remaining_time = `투표 종료까지 ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')} 남음`;
        } else {
          topic.vote_remaining_time = '투표 종료';
        }
      } else {
        topic.vote_remaining_time = null; // or '시간 정보 없음'
      }

      return topic;
    }

    return null;
  } catch (error) {
    console.error("Error fetching topic by ID:", error);
    return null;
  }
}

/**
 * 메시지 텍스트에서 토픽 정보 추출
 */
export async function extractTopicPreview(content: string): Promise<any | null> {
  const topicId = extractTopicId(content);

  if (!topicId) {
    return null;
  }

  const topic = await getTopicById(topicId);
  return topic;
}
