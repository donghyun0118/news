import {
  Controller,
  ForbiddenException,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JobsService } from './jobs.service';

@ApiTags('Jobs')
@Controller('api/jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  private ensureValidSecret(secret: string) {
    if (!this.jobsService.isSecretConfigured()) {
      throw new NotFoundException('Job trigger secret is not configured.');
    }
    if (!this.jobsService.isValidSecret(secret)) {
      throw new ForbiddenException('Invalid job trigger secret.');
    }
  }

  @Post('trigger-collector/:secret')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: '최신 기사 수집 배치 실행',
    description:
      'URL 경로에 포함된 시크릿이 일치할 경우, Python 스크립트를 실행해 최신 기사를 수집합니다. 이미 실행 중이면 새로운 작업은 건너뜁니다.',
  })
  @ApiParam({
    name: 'secret',
    description: '작업 실행을 허용하는 보안 토큰',
    example: 'my-secret-token',
  })
  @ApiResponse({
    status: 202,
    description: '기사 수집 작업이 시작되었거나 이미 실행 중입니다.',
  })
  async triggerCollector(@Param('secret') secret: string) {
    this.ensureValidSecret(secret);
    return this.jobsService.triggerCollector();
  }

  @Post('update-popularity/:secret')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: '기사 인기도 점수 재계산',
    description:
      '시크릿이 일치하면 Python 스크립트를 실행해 전 기사에 대한 인기도(popularity score)를 다시 계산합니다.',
  })
  @ApiParam({
    name: 'secret',
    description: '작업 실행을 허용하는 보안 토큰',
    example: 'my-secret-token',
  })
  @ApiResponse({
    status: 202,
    description: '인기도 점수 재계산 작업이 시작되었습니다.',
  })
  @ApiResponse({
    status: 429,
    description: '이미 인기도 계산 작업이 실행 중입니다.',
  })
  async updatePopularity(@Param('secret') secret: string) {
    this.ensureValidSecret(secret);
    return this.jobsService.updatePopularity();
  }

  @Post('prune-home-articles/:secret')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: '메인 화면 기사 정리 작업 실행',
    description:
      '시크릿이 일치하면 Python 스크립트를 실행해 메인 화면에 오래된 기사를 정리(prune)합니다.',
  })
  @ApiParam({
    name: 'secret',
    description: '작업 실행을 허용하는 보안 토큰',
    example: 'my-secret-token',
  })
  @ApiResponse({
    status: 202,
    description: '기사 정리 작업이 시작되었습니다.',
  })
  @ApiResponse({
    status: 429,
    description: '이미 기사 정리 작업이 실행 중입니다.',
  })
  async pruneHomeArticles(@Param('secret') secret: string) {
    this.ensureValidSecret(secret);
    return this.jobsService.pruneHomeArticles();
  }

  @Post('run-vector-indexer/:secret')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: '벡터 인덱싱 작업 수동 트리거',
    description:
      '시크릿이 일치하면 Python 스크립트(daily_vectorizer.py)를 실행해 벡터 인덱싱을 수행합니다.',
  })
  @ApiParam({
    name: 'secret',
    description: '작업 실행을 허용하는 보안 토큰',
    example: 'my-secret-token',
  })
  @ApiResponse({
    status: 202,
    description: '벡터 인덱싱 작업이 시작되었습니다.',
  })
  async runVectorIndexer(@Param('secret') secret: string) {
    this.ensureValidSecret(secret);
    return this.jobsService.runVectorIndexer();
  }

  @Post('trigger-pipeline/:secret')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: '기사 수집 및 임베딩 파이프라인 실행',
    description:
      '시크릿이 일치하면 Python 스크립트(run_pipeline.py)를 실행해 기사 수집과 임베딩을 순차적으로 수행합니다.',
  })
  @ApiParam({
    name: 'secret',
    description: '작업 실행을 허용하는 보안 토큰',
    example: 'my-secret-token',
  })
  @ApiResponse({
    status: 202,
    description: '파이프라인 작업이 시작되었습니다.',
  })
  async triggerPipeline(@Param('secret') secret: string) {
    this.ensureValidSecret(secret);
    return this.jobsService.triggerPipeline();
  }
}
