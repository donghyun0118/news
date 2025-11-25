#!/usr/bin/env python3
"""
continuous_vectorizer.py
로컬 PC에서 계속 실행되면서 10분마다 기사 수집 + 벡터 인덱싱 파이프라인을 수행합니다.
"""
import time
import logging
import subprocess
import sys
import os

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)

INTERVAL_SECONDS = 15 * 60  # 15분

def run_pipeline():
    """run_pipeline.py를 서브프로세스로 실행"""
    script_path = os.path.join(os.path.dirname(__file__), "run_pipeline.py")
    result = subprocess.run([sys.executable, script_path])
    return result.returncode == 0

if __name__ == "__main__":
    logging.info("=== Continuous Pipeline Runner Started ===")
    logging.info(f"Will run collection + embedding every {INTERVAL_SECONDS // 60} minutes")
    
    while True:
        try:
            logging.info("--- Starting pipeline cycle (Collection → Embedding) ---")
            success = run_pipeline()
            if success:
                logging.info("✅ Pipeline completed successfully")
            else:
                logging.warning("⚠️ Pipeline finished with errors")
            
            logging.info(f"--- Sleeping for {INTERVAL_SECONDS // 60} minutes ---")
            time.sleep(INTERVAL_SECONDS)
        except KeyboardInterrupt:
            logging.info("Shutting down gracefully...")
            break
        except Exception as e:
            logging.error(f"Error during pipeline: {e}")
            logging.info("Continuing after error...")
            time.sleep(60)  # 에러 발생 시 1분 대기 후 재시도