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
