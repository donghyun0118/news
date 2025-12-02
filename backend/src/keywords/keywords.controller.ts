import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { KeywordsService } from './keywords.service';

@ApiTags('Keywords')
@Controller('keywords')
export class KeywordsController {
  constructor(private readonly keywordsService: KeywordsService) {}

  @Get('trending')
  @ApiOperation({ summary: '이슈 NOW - 인기 키워드 5개와 관련 기사 조회' })
  async getTrendingKeywords() {
    return this.keywordsService.getTrendingKeywords();
  }
}
