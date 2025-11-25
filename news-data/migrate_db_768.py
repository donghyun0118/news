import os
import mysql.connector
from dotenv import load_dotenv

# Load environment variables
dotenv_path = os.path.join(os.path.dirname(__file__), '..', '.env')
load_dotenv(dotenv_path=dotenv_path)

DB_CONFIG = {
    "host": os.getenv("DB_HOST"),
    "port": int(os.getenv("DB_PORT", 3306)),
    "user": os.getenv("DB_USER"),
    "password": os.getenv("DB_PASSWORD"),
    "database": os.getenv("DB_DATABASE"),
}

if os.getenv("DB_SSL_ENABLED") == 'true':
    # Local Windows environment usually doesn't have the CA cert at /etc/ssl/...
    # For migration script, we can skip verification or use the system store if available.
    # Simulating the logic from other scripts:
    DB_CONFIG["ssl_verify_cert"] = False
    DB_CONFIG["ssl_disabled"] = False # Ensure SSL is still used if required by DB

def migrate_schema():
    print("--- Starting DB Schema Migration (384 -> 768) ---")
    conn = None
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor()
        print("DB Connected.")

        # 1. 기존 데이터 초기화 (차원이 다르면 변환 불가하므로 NULL로 설정)
        print("Step 1: Clearing existing embeddings (setting to NULL)...")
        cursor.execute("UPDATE tn_home_article SET embedding = NULL")
        conn.commit()
        print("Done.")

        # 2. 컬럼 타입 변경
        print("Step 2: Altering column to VECTOR(768)...")
        # TiDB/MySQL Vector syntax
        cursor.execute("ALTER TABLE tn_home_article MODIFY COLUMN embedding VECTOR(768)")
        conn.commit()
        print("Done.")
        
        print("✅ Migration Successful! Database is now ready for e5-base.")

    except mysql.connector.Error as err:
        print(f"❌ Database Error: {err}")
    finally:
        if conn and conn.is_connected():
            cursor.close()
            conn.close()
            print("Connection closed.")

if __name__ == "__main__":
    migrate_schema()
