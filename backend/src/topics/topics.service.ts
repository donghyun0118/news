import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import type { Pool } from 'mysql2/promise';
import { ArticleRow, processArticles } from '../common/utils/article-helpers';
import { DB_CONNECTION_POOL } from '../database/database.constants';

@Injectable()
export class TopicsService {
  constructor(@Inject(DB_CONNECTION_POOL) private readonly dbPool: Pool) {}

  async getTopics(): Promise<any> {
    try {
      const [rows] = await this.dbPool.query(
        "SELECT id, display_name, summary, published_at, view_count, vote_end_at FROM tn_topic WHERE status = 'OPEN' AND topic_type = 'VOTING' ORDER BY published_at DESC",
      );
      return rows;
    } catch (error) {
      console.error('Error fetching topics:', error);
      throw new InternalServerErrorException('Server error');
    }
  }

  async getPopularRanking(): Promise<any> {
    try {
      const [rows] = await this.dbPool.query(
        `
        SELECT
          t.id,
          t.display_name,
          t.summary,
          t.published_at,
          t.view_count,
          t.vote_end_at,
          (t.vote_count_left + t.vote_count_right) AS total_votes,
          COALESCE(c.comment_count, 0) AS comment_count,
          -- Popularity Score: Votes + (Comments * 10) + Views
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
        ORDER BY
          popularity_score DESC,
          t.published_at DESC
        LIMIT 10
        `,
      );
      return rows;
    } catch (error) {
      console.error('Error fetching popular topics ranking:', error);
      throw new InternalServerErrorException('Server error');
    }
  }

  async getLatestTopics(): Promise<any> {
    try {
      const [rows] = await this.dbPool.query(
        `SELECT id, display_name, summary, published_at, view_count, vote_end_at
         FROM tn_topic 
         WHERE status = 'OPEN' AND topic_type = 'VOTING'
         ORDER BY published_at DESC
         LIMIT 10`,
      );
      return rows;
    } catch (error) {
      console.error('Error fetching latest topics:', error);
      throw new InternalServerErrorException('Server error');
    }
  }

  async getAllPopularTopics(): Promise<any> {
    try {
      const [rows] = await this.dbPool.query(
        `
        SELECT
          t.id,
          t.display_name,
          t.summary,
          t.published_at,
          t.view_count,
          t.vote_end_at,
          (t.vote_count_left + t.vote_count_right) AS total_votes,
          COALESCE(c.comment_count, 0) AS comment_count,
          -- Popularity Score: Votes + (Comments * 10) + Views
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
        ORDER BY
          popularity_score DESC,
          t.published_at DESC
        `,
      );
      return rows;
    } catch (error) {
      console.error('Error fetching all popular topics:', error);
      throw new InternalServerErrorException('Server error');
    }
  }

  async getTopicDetail(topicId: number, userId?: number): Promise<any> {
    try {
      const [topicRows]: any = await this.dbPool.query(
        `
        SELECT
          t.id, t.display_name, t.summary, t.published_at, t.view_count, t.collection_status,
          t.vote_count_left, t.vote_count_right,
          t.stance_left, t.stance_right,
          t.vote_start_at, t.vote_end_at,
          v.side as my_vote
        FROM tn_topic t
        LEFT JOIN tn_topic_vote v ON t.id = v.topic_id AND v.user_id = ?
        WHERE t.id = ? AND t.status = 'OPEN'
        `,
        [userId, topicId],
      );

      if (topicRows.length === 0) {
        throw new NotFoundException('Topic not found');
      }

      const [articleRows] = await this.dbPool.query(
        `
        SELECT
          a.id, a.source, a.source_domain, a.side, a.title, a.url, a.published_at, a.is_featured, a.thumbnail_url, a.view_count,
          IF(s_user.id IS NOT NULL, 1, 0) AS isSaved
        FROM
          tn_article a
        LEFT JOIN
          tn_user_saved_articles s_user ON a.id = s_user.article_id AND s_user.user_id = ?
        WHERE
          a.topic_id = ? AND a.status = 'published'
        ORDER BY
          a.display_order ASC, a.published_at DESC
        `,
        [userId, topicId],
      );

      const articles = processArticles(articleRows as ArticleRow[]).map(
        (article: any) => ({
          ...article,
          isSaved: Boolean(article.isSaved),
        }),
      );

      const responseData = {
        topic: topicRows[0],
        articles: articles,
      };
      return responseData;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('Error fetching topic details:', error);
      throw new InternalServerErrorException('Server error');
    }
  }

  async incrementTopicView(
    topicId: number,
    userId: number | null,
    ip: string,
  ): Promise<any> {
    const userIdentifier = userId ? `user_${userId}` : `ip_${ip}`;
    const cooldownHours = 24;

    const connection = await this.dbPool.getConnection();
    try {
      await connection.beginTransaction();

      const [recentViews]: any = await connection.query(
        `SELECT id FROM tn_topic_view_log
         WHERE topic_id = ? AND user_identifier = ? AND created_at >= NOW() - INTERVAL ? HOUR`,
        [topicId, userIdentifier, cooldownHours],
      );

      if (recentViews.length > 0) {
        await connection.rollback();
        return { message: 'View already counted within the cooldown period.' };
      }

      await connection.query(
        'INSERT INTO tn_topic_view_log (topic_id, user_identifier) VALUES (?, ?)',
        [topicId, userIdentifier],
      );

      const [updateResult]: any = await connection.query(
        'UPDATE tn_topic SET view_count = view_count + 1 WHERE id = ?',
        [topicId],
      );

      if (updateResult.affectedRows === 0) {
        await connection.rollback();
        throw new NotFoundException('Topic not found.');
      }

      await connection.commit();
      return { message: 'Topic view count incremented.' };
    } catch (error) {
      await connection.rollback();
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error(
        `Error incrementing topic view count for topic ${topicId}:`,
        error,
      );
      throw new InternalServerErrorException('Server error');
    } finally {
      connection.release();
    }
  }

  async castStanceVote(
    topicId: number,
    userId: number,
    side: 'LEFT' | 'RIGHT',
  ): Promise<any> {
    const connection = await this.dbPool.getConnection();
    try {
      await connection.beginTransaction();

      const [existingVote]: any = await connection.query(
        'SELECT side FROM tn_topic_vote WHERE topic_id = ? AND user_id = ?',
        [topicId, userId],
      );

      if (existingVote.length > 0) {
        await connection.rollback();
        throw new BadRequestException(
          '이미 투표하셨습니다. 투표는 한 번만 가능합니다.',
        );
      }

      await connection.query(
        'INSERT INTO tn_topic_vote (topic_id, user_id, side) VALUES (?, ?, ?)',
        [topicId, userId, side],
      );

      const toIncrement =
        side === 'LEFT' ? 'vote_count_left' : 'vote_count_right';

      await connection.query(
        `UPDATE tn_topic SET ${toIncrement} = ${toIncrement} + 1 WHERE id = ?`,
        [topicId],
      );

      await connection.commit();
      return { message: 'Vote cast successfully.' };
    } catch (error) {
      await connection.rollback();
      if (error instanceof BadRequestException) {
        throw error;
      }
      console.error(`Error casting vote for topic ${topicId}:`, error);
      throw new InternalServerErrorException('Server error');
    } finally {
      connection.release();
    }
  }
}
