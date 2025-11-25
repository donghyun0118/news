import os
import mysql.connector
from dotenv import load_dotenv

def calculate_and_update_popularity():
    """
    토픽의 인기 점수를 계산하고 DB를 업데이트합니다.
    - 최종 점수 = 투표수 + (댓글수 × 10) + 토픽 조회수
    - 투표수 = vote_count_left + vote_count_right
    """
    
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
        is_production = os.getenv('NODE_ENV') == 'production'
        if is_production:
            DB_CONFIG["ssl_ca"] = "/etc/ssl/certs/ca-certificates.crt"
            DB_CONFIG["ssl_verify_cert"] = True
        else:
            DB_CONFIG["ssl_verify_cert"] = False
            
    print("--- Popularity Score Calculation Start ---")
    
    try:
        cnx = mysql.connector.connect(**DB_CONFIG)
        cursor = cnx.cursor(dictionary=True)
        print("DB Connected.")

        # 새로운 공식: 투표수 + (댓글수 * 10) + 조회수
        query = """
            SELECT
                t.id,
                t.display_name,
                t.vote_count_left,
                t.vote_count_right,
                t.view_count,
                COALESCE(c.comment_count, 0) AS comment_count,
                -- Calculate popularity score
                (t.vote_count_left + t.vote_count_right) + (COALESCE(c.comment_count, 0) * 10) + t.view_count AS popularity_score
            FROM
                tn_topic t
            LEFT JOIN (
                SELECT topic_id, COUNT(*) AS comment_count
                FROM tn_topic_comment
                WHERE status = 'ACTIVE'
                GROUP BY topic_id
            ) c ON t.id = c.topic_id
            WHERE
                t.status = 'OPEN' AND t.topic_type = 'VOTING'
        """
        
        cursor.execute(query)
        topics_to_update = cursor.fetchall()
        print(f"Found {len(topics_to_update)} topics to update.")

        if topics_to_update:
            # Reset all scores first
            cursor.execute("UPDATE tn_topic SET popularity_score = 0 WHERE topic_type = 'VOTING'")
            print("Reset scores for voting topics.")

            # Update with new scores
            update_queries = [(topic['popularity_score'], topic['id']) for topic in topics_to_update]
            update_query = "UPDATE tn_topic SET popularity_score = %s WHERE id = %s"
            cursor.executemany(update_query, update_queries)
            cnx.commit()
            print(f"Successfully updated scores for {cursor.rowcount} topics.")
            
            # Show top 5 for verification
            print("\nTop 5 Popular Topics:")
            for i, topic in enumerate(sorted(topics_to_update, key=lambda x: x['popularity_score'], reverse=True)[:5], 1):
                print(f"  {i}. {topic['display_name']}: {topic['popularity_score']} points")
                print(f"     (Votes: {topic['vote_count_left'] + topic['vote_count_right']}, "
                      f"Comments: {topic['comment_count']}, Views: {topic['view_count']})")

    except mysql.connector.Error as err:
        print(f"Database Error: {err}")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
    finally:
        if 'cnx' in locals() and cnx.is_connected():
            cursor.close()
            cnx.close()
            print("DB Connection Closed.")
            
    print("--- Popularity Score Calculation End ---")


if __name__ == '__main__':
    calculate_and_update_popularity()
