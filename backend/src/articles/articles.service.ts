import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import type { Pool } from 'mysql2/promise';
import { DB_CONNECTION_POOL } from '../database/database.constants';

import { FAVICON_URLS, ArticleRow, processArticles } from '../common/utils/article-helpers';

@Injectable()
export class ArticlesService {
  constructor(@Inject(DB_CONNECTION_POOL) private readonly dbPool: Pool) {}



  async getArticlesByCategory(categoryName: string) {
    if (!categoryName) {
      throw new BadRequestException(
        "카테고리 이름은 'name' 쿼리 파라미터로 전달되어야 합니다.",
      );
    }

    try {
      const query = `
        SELECT id, title, description, url, thumbnail_url, published_at, source, source_domain, category
        FROM tn_home_article
        WHERE category = ? AND published_at >= NOW() - INTERVAL 7 DAY
        ORDER BY published_at DESC
      `;
      const [rows] = await this.dbPool.query(query, [categoryName]);
      return processArticles(rows as ArticleRow[]);
    } catch (error) {
      console.error('Error fetching articles by category:', error);
      throw new InternalServerErrorException('Server error');
    }
  }

  async getExclusiveArticles(
    limit: number,
    offset: number,
    userId?: number | null,
  ) {
    try {
      const query = `
        SELECT a.*
        FROM tn_home_article a
        WHERE a.title LIKE '%[단독]%'
        ORDER BY a.published_at DESC
        LIMIT ? OFFSET ?
      `;
      const [rows] = await this.dbPool.query(query, [limit, offset]);
      return processArticles(rows as ArticleRow[]);
    } catch (error) {
      console.error('Error fetching exclusive articles:', error);
      throw new InternalServerErrorException('Server error');
    }
  }

  async getBreakingArticles(
    limit: number,
    offset: number,
    userId?: number | null,
  ) {
    try {
      const query = `
        SELECT a.*
        FROM tn_home_article a
        WHERE a.title LIKE '%[속보]%'
        ORDER BY a.published_at DESC
        LIMIT ? OFFSET ?
      `;
      const [rows] = await this.dbPool.query(query, [limit, offset]);
      return processArticles(rows as ArticleRow[]);
    } catch (error) {
      console.error('Error fetching breaking articles:', error);
      throw new InternalServerErrorException('Server error');
    }
  }

  async searchArticles(query: string) {
    if (!query || query.trim() === '') {
      throw new BadRequestException('검색어를 입력해주세요.');
    }

    const searchQuery = `%${query}%`;

    try {
      const [topicRows]: any = await this.dbPool.query(
        `SELECT id, display_name, published_at, vote_end_at, stance_left, stance_right, (vote_count_left + vote_count_right) AS total_votes
         FROM tn_topic
         WHERE status IN ('OPEN', 'CLOSED')
           AND topic_type = 'VOTING'
           AND display_name LIKE ?
         ORDER BY published_at DESC
         LIMIT 5`,
        [searchQuery],
      );

      const [articleRows]: any = await this.dbPool.query(
        `SELECT a.*
         FROM tn_home_article a
         WHERE (a.title LIKE ? OR a.description LIKE ?)
         ORDER BY a.published_at DESC
         LIMIT 50`,
        [searchQuery, searchQuery],
      );

      const articlesWithFavicon = processArticles(
        articleRows as ArticleRow[],
      );

      return {
        relatedTopics: topicRows,
        articles: articlesWithFavicon,
      };
    } catch (error) {
      console.error('Error searching articles:', error);
      throw new InternalServerErrorException('Server error');
    }
  }

  async saveArticle(articleId: number, userId: number, articleType: 'home' | 'topic') {
    const connection = await this.dbPool.getConnection();
    try {
      await connection.beginTransaction();
      let homeArticleId: number | null = null;

      if (articleType === 'home') {
        const [articleRows]: any = await connection.query("SELECT id FROM tn_home_article WHERE id = ?", [articleId]);
        if (articleRows.length === 0) {
          await connection.rollback();
          throw new NotFoundException("Article not found in tn_home_article.");
        }
        homeArticleId = articleId;
      } else { // articleType === 'topic'
        const [articleRows]: any = await connection.query("SELECT url FROM tn_article WHERE id = ?", [articleId]);
        if (articleRows.length === 0) {
          await connection.rollback();
          throw new NotFoundException("Article not found in tn_article.");
        }
        const articleUrl = articleRows[0].url;

        const [homeArticleRows]: any = await connection.query("SELECT id FROM tn_home_article WHERE url = ?", [articleUrl]);
        if (homeArticleRows.length === 0) {
          await connection.rollback();
          throw new NotFoundException("Corresponding article not found in tn_home_article.");
        }
        homeArticleId = homeArticleRows[0].id;
      }

      if (homeArticleId === null) {
          await connection.rollback();
          throw new InternalServerErrorException("Could not determine the article ID to save.");
      }
      
      const [result]: any = await connection.query(
        'INSERT IGNORE INTO tn_user_saved_articles (user_id, article_id) VALUES (?, ?)',
        [userId, homeArticleId],
      );

      if (result.affectedRows === 0) {
        await connection.rollback();
        const [existing]: any = await connection.query(
          "SELECT id FROM tn_user_saved_articles WHERE user_id = ? AND article_id = ?",
          [userId, homeArticleId]
        );
        throw new ConflictException({ 
            message: "Article already saved.",
            data: {
                savedArticleId: existing.length > 0 ? existing[0].id : null
            }
        });
      }

      await connection.commit();
      return {
        message: 'Article saved successfully.',
        data: {
          savedArticleId: result.insertId,
          userId,
          articleId: homeArticleId,
        },
      };
    } catch (error) {
      await connection.rollback();
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }
      console.error('Error saving article:', error);
      throw new InternalServerErrorException('Server error');
    } finally {
      connection.release();
    }
  }

  async unsaveArticle(articleId: number, userId: number, articleType: 'home' | 'topic') {
    const connection = await this.dbPool.getConnection();
    try {
      await connection.beginTransaction();
      let homeArticleId: number | null = null;

      if (articleType === 'home') {
          homeArticleId = articleId;
      } else { // articleType === 'topic'
          const [articleRows]: any = await connection.query("SELECT url FROM tn_article WHERE id = ?", [articleId]);
          if (articleRows.length === 0) {
              await connection.rollback();
              throw new NotFoundException("Original topic article not found, cannot determine which article to unsave.");
          }
          const articleUrl = articleRows[0].url;

          const [homeArticleRows]: any = await connection.query("SELECT id FROM tn_home_article WHERE url = ?", [articleUrl]);
          if (homeArticleRows.length === 0) {
               await connection.rollback();
               throw new NotFoundException("Corresponding home article not found, cannot unsave.");
          }
          homeArticleId = homeArticleRows[0].id;
      }
      
      if (homeArticleId === null) {
           await connection.rollback();
           throw new InternalServerErrorException("Could not determine the article ID to unsave.");
      }

      const [result]: any = await connection.query(
        'DELETE FROM tn_user_saved_articles WHERE user_id = ? AND article_id = ?',
        [userId, homeArticleId],
      );

      if (result.affectedRows === 0) {
        await connection.rollback();
        throw new NotFoundException('Saved article not found.');
      }

      await connection.commit();
      return { message: 'Article unsaved successfully.' };
    } catch (error) {
      await connection.rollback();
      if (error instanceof NotFoundException || error instanceof InternalServerErrorException) {
        throw error;
      }
      console.error('Error unsaving article:', error);
      throw new InternalServerErrorException('Server error');
    } finally {
      connection.release();
    }
  }
}
