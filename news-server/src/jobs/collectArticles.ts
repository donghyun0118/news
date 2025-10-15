import axios from 'axios';
import { FEEDS } from '../config/feeds';

export const collectLatestArticles = async () => {
  console.log('최종 원인 파악을 위한 디버깅을 시작합니다...');
  try {
    const targetFeed = FEEDS.find(f => f.source === '중앙일보');
    if (!targetFeed) {
      console.log('디버깅 타겟인 중앙일보 피드를 찾을 수 없습니다.');
      return;
    }

    console.log(`접속 시도 URL: ${targetFeed.url}`);

    const response = await axios.get<string>(encodeURI(targetFeed.url), {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
        }
    });

    console.log('--- AXIOS가 받은 RAW DATA --- (이 내용이 XML이 아니면 문제가 확실합니다)');
    console.log(response.data);
    console.log('--- END RAW DATA ---');

  } catch (error) {
    console.error('최종 디버깅 중 오류 발생:', error);
  }
};

if (require.main === module) {
  collectLatestArticles();
}