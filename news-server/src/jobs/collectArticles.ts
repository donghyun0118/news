import pool from '../config/db';
import { FEEDS } from '../config/feeds';
import Parser from 'rss-parser';

// 스크립트의 메인 로직을 담을 비동기 함수
const collectLatestArticles = async () => {
  console.log('최신 기사 수집을 시작합니다...');
  let connection;
  try {
    // 1. 데이터베이스 커넥션을 가져옵니다.
    connection = await pool.getConnection();
    console.log('데이터베이스에 연결되었습니다.');

    // 2. 모든 RSS 피드를 병렬로 파싱합니다.
    const parser = new Parser();
    const allParsedArticles: any[] = [];

    const feedPromises = FEEDS.map(async (feed) => {
      try {
        const parsedFeed = await parser.parseURL(feed.url);
        if (parsedFeed && parsedFeed.items) {
            parsedFeed.items.forEach(item => {
                if (item.link && item.title) {
                    allParsedArticles.push({
                        source: feed.source,
                        source_domain: feed.source_domain,
                        side: feed.side,
                        title: item.title,
                        url: item.link,
                        published_at: item.pubDate ? new Date(item.pubDate) : null,
                        thumbnail_url: item.enclosure?.url || null, // 기본 썸네일 로직
                    });
                }
            });
        }
      } catch (error) {
        console.error(`'${feed.source}' (${feed.url}) 피드 파싱 중 오류 발생:`, error);
      }
    });

    await Promise.allSettled(feedPromises);
    console.log(`총 ${allParsedArticles.length}개의 기사를 피드에서 파싱했습니다.`);

    if (allParsedArticles.length === 0) {
      console.log('새로운 기사가 없습니다. 작업을 종료합니다.');
      return; 
    }

    // 3. DB에 이미 있는 기사를 필터링하고, 새로운 기사만 대량 삽입(Bulk Insert)합니다.
    const allUrls = allParsedArticles.map(article => article.url);
    const [existingRows] = await connection.query<any>(
      'SELECT url FROM tn_home_article WHERE url IN (?)',
      [allUrls]
    );
    const existingUrls = new Set(existingRows.map((row: any) => row.url));

    const newArticles = allParsedArticles.filter(article => !existingUrls.has(article.url));

    console.log(`총 ${newArticles.length}개의 새로운 기사를 발견했습니다.`);

    if (newArticles.length > 0) {
      const values = newArticles.map(article => [
        article.source,
        article.source_domain,
        article.side,
        article.title,
        article.url,
        article.published_at,
        article.thumbnail_url
      ]);

      await connection.query(
        'INSERT INTO tn_home_article (source, source_domain, side, title, url, published_at, thumbnail_url) VALUES ?',
        [values]
      );
      console.log(`${newArticles.length}개의 새로운 기사를 데이터베이스에 저장했습니다.`);
    }

    console.log('최신 기사 수집을 성공적으로 완료했습니다.');

  } catch (error) {
    console.error('기사 수집 중 오류가 발생했습니다:', error);
  } finally {
    // 4. 작업이 끝나면 반드시 커넥션을 반환합니다.
    if (connection) {
      connection.release();
      console.log('데이터베이스 연결이 종료되었습니다.');
    }
  }
};

// 스크립트 실행
collectLatestArticles();
