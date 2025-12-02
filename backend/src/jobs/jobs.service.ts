import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { spawn } from 'child_process';
import os from 'os';
import path from 'path';

export interface JobResult {
  message: string;
}

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);
  private readonly jobSecret: string;
  private readonly pythonCommand: string;
  private readonly projectRoot: string;

  private isCollectorRunning = false;
  private isPopularityJobRunning = false;
  private isPruningJobRunning = false;

  constructor(private readonly configService: ConfigService) {
    this.jobSecret = this.configService.get<string>('JOB_TRIGGER_SECRET') ?? '';

    if (!this.jobSecret) {
      this.logger.warn(
        '경고: JOB_TRIGGER_SECRET 환경 변수가 설정되지 않았습니다. Job API가 비활성화됩니다.',
      );
    }

    this.pythonCommand =
      this.configService.get<string>('PYTHON_EXECUTABLE_PATH') ??
      (os.platform() === 'win32' ? 'python' : 'python3');

    this.projectRoot = path.resolve(__dirname, '..', '..', '..');
  }

  isSecretConfigured(): boolean {
    return Boolean(this.jobSecret);
  }

  isValidSecret(secret: string): boolean {
    return secret === this.jobSecret;
  }

  async triggerCollector(): Promise<JobResult> {
    if (this.isCollectorRunning) {
      this.logger.log(
        'Article collection job is already running. Skipping duplicate trigger.',
      );
      return { message: 'Article collection job is already running.' };
    }

    this.isCollectorRunning = true;
    this.runPythonJob(
      ['scripts', 'rss_collector.py'],
      'article collection',
      () => {
        this.isCollectorRunning = false;
      },
    );

    return { message: 'Article collection job started.' };
  }

  async updatePopularity(): Promise<JobResult> {
    if (this.isPopularityJobRunning) {
      throw new HttpException(
        'Popularity calculation job is already in progress.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    this.isPopularityJobRunning = true;
    this.runPythonJob(
      ['scripts', 'popularity_calculator.py'],
      'popularity calculation',
      () => {
        this.isPopularityJobRunning = false;
      },
    );

    return { message: 'Popularity calculation job started.' };
  }

  async pruneHomeArticles(): Promise<JobResult> {
    if (this.isPruningJobRunning) {
      throw new HttpException(
        'Home article pruning job is already in progress.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    this.isPruningJobRunning = true;
    this.runPythonJob(
      ['scripts', 'home_article_pruner.py'],
      'home article pruning',
      () => {
        this.isPruningJobRunning = false;
      },
    );

    return { message: 'Home article pruning job started.' };
  }

  async runVectorIndexer(): Promise<JobResult> {
    // Note: We don't track isRunning for vector indexer strictly because it might be run in parallel or overlap is acceptable/managed by lock file in python script usually.
    // But to be safe and consistent, we can add a flag if needed. For now, let's allow it or rely on the script's internal locking.
    // The user's python script `daily_vectorizer.py` seems to have a lock file mechanism based on previous logs.

    this.runPythonJob(
      ['scripts', 'daily_vectorizer.py'],
      'vector indexer',
      () => {
        // callback
      },
    );

    return { message: 'Vector indexer job started.' };
  }

  async triggerPipeline(): Promise<JobResult> {
    // Pipeline runs collector then vectorizer.
    // We can run `run_pipeline.py` if it exists, or chain them.
    // The user mentioned `run_pipeline.py` in the logs.

    this.runPythonJob(['scripts', 'run_pipeline.py'], 'full pipeline', () => {
      // callback
    });

    return { message: 'Full pipeline job started.' };
  }

  private runPythonJob(
    scriptSegments: string[],
    jobLabel: string,
    onFinish: () => void,
  ) {
    const scriptPath = path.resolve(this.projectRoot, ...scriptSegments);
    const scriptName = path.basename(scriptPath);

    this.logger.log(
      `Starting ${jobLabel} job via ${scriptName} (python command: ${this.pythonCommand})`,
    );

    const pythonProcess = spawn(this.pythonCommand, ['-u', scriptPath], {
      env: { ...process.env },
    });

    const finalize = (() => {
      let called = false;
      return () => {
        if (!called) {
          called = true;
          onFinish();
        }
      };
    })();

    pythonProcess.stdout.on('data', (data: Buffer) => {
      this.logger.log(`[${scriptName} stdout] ${data.toString().trim()}`);
    });

    pythonProcess.stderr.on('data', (data: Buffer) => {
      this.logger.error(`[${scriptName} stderr] ${data.toString().trim()}`);
    });

    pythonProcess.on('close', (code) => {
      this.logger.log(
        `${scriptName} exited with code ${code ?? 'unknown (close event)'}`,
      );
      finalize();
    });

    pythonProcess.on('error', (error) => {
      this.logger.error(
        `${scriptName} failed to start. Check PYTHON_EXECUTABLE_PATH and script path.`,
        error,
      );
      finalize();
    });
  }
}
