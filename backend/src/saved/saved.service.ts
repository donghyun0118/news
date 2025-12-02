import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { DB_CONNECTION_POOL } from '../database/database.constants';
import type { Pool, RowDataPacket } from 'mysql2/promise';

@Injectable()
export class SavedService {
  constructor(@Inject(DB_CONNECTION_POOL) private readonly dbPool: Pool) {}

  async createCategory(userId: number, name: string) {
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      throw new BadRequestException('카테고리 이름을 입력해주세요.');
    }

    try {
      const [result]: any = await this.dbPool.query(
        'INSERT INTO tn_user_saved_article_categories (user_id, name) VALUES (?, ?)',
        [userId, name.trim()],
      );
      return { id: result.insertId, name: name.trim() };
    } catch (error: any) {
      if (error.code === 'ER_DUP_ENTRY') {
        throw new ConflictException('이미 존재하는 카테고리 이름입니다.');
      }
      console.error('Error creating category:', error);
      throw new InternalServerErrorException('서버 오류가 발생했습니다.');
    }
  }

  async getCategories(userId: number) {
    try {
      const [rows] = await this.dbPool.query(
        'SELECT id, name, created_at FROM tn_user_saved_article_categories WHERE user_id = ? ORDER BY created_at ASC',
        [userId],
      );
      return rows;
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw new InternalServerErrorException('서버 오류가 발생했습니다.');
    }
  }

  async getSavedArticles(
    userId: number,
    options: { categoryId?: number; limit: number; offset: number },
  ) {
    const { categoryId, limit, offset } = options;
    try {
      // --- Main Query for paginated articles ---
      let articlesQueryStr = `
        SELECT
          s.id as saved_article_id,
          s.category_id,
          s.created_at as saved_at,
          h.id as article_id,
          h.title,
          h.url,
          h.thumbnail_url,
          h.source,
          h.source_domain,
          h.published_at
        FROM
          tn_user_saved_articles s
        JOIN
          tn_home_article h ON s.article_id = h.id
        WHERE
          s.user_id = ?
      `;
      const articleParams: (string | number)[] = [userId];

      if (categoryId) {
        articlesQueryStr += ' AND s.category_id = ?';
        articleParams.push(categoryId);
      }
      articlesQueryStr += ' ORDER BY s.created_at DESC LIMIT ? OFFSET ?';
      articleParams.push(limit, offset);
      const articlesQuery = this.dbPool.query(articlesQueryStr, articleParams);

      // --- Total Count Query ---
      let countQueryStr =
        'SELECT COUNT(*) as totalCount FROM tn_user_saved_articles WHERE user_id = ?';
      const countParams: (string | number)[] = [userId];
      if (categoryId) {
        countQueryStr += ' AND category_id = ?';
        countParams.push(categoryId);
      }
      const countQuery = this.dbPool.query(countQueryStr, countParams);

      // --- Category Breakdown Query ---
      const byCategoryQuery = this.dbPool.query(
        `SELECT c.name as category, COUNT(usa.id) as count
         FROM tn_user_saved_articles usa
         JOIN tn_user_saved_article_categories c ON usa.category_id = c.id
         WHERE usa.user_id = ? AND usa.category_id IS NOT NULL
         GROUP BY c.name
         ORDER BY count DESC`,
        [userId],
      );

      const [[articleRows], [countResult], [byCategoryResult]] =
        await Promise.all([articlesQuery, countQuery, byCategoryQuery]);

      // TODO: processArticles to add favicon, similar to ArticlesService

      return {
        articles: articleRows,
        totalCount: (countResult as any)[0].totalCount,
        byCategory: byCategoryResult,
      };
    } catch (error) {
      console.error('Error fetching saved articles:', error);
      throw new InternalServerErrorException('서버 오류가 발생했습니다.');
    }
  }

  async updateSavedArticleCategory(
    userId: number,
    savedArticleId: number,
    categoryId: number | null,
  ) {
    const connection = await this.dbPool.getConnection();
    try {
      await connection.beginTransaction();

      if (categoryId) {
        const [categoryRows]: any = await connection.query(
          'SELECT id FROM tn_user_saved_article_categories WHERE id = ? AND user_id = ?',
          [categoryId, userId],
        );
        if (categoryRows.length === 0) {
          throw new ForbiddenException(
            '자신의 카테고리가 아니거나 존재하지 않는 카테고리입니다.',
          );
        }
      }

      const [updateResult]: any = await connection.query(
        'UPDATE tn_user_saved_articles SET category_id = ? WHERE id = ? AND user_id = ?',
        [categoryId, savedArticleId, userId],
      );

      if (updateResult.affectedRows === 0) {
        throw new NotFoundException(
          '자신이 저장한 기사가 아니거나, 해당 기사를 찾을 수 없습니다.',
        );
      }

      await connection.commit();
      return { message: '카테고리가 업데이트되었습니다.' };
    } catch (error) {
      await connection.rollback();
      if (error instanceof ForbiddenException || error instanceof NotFoundException) {
        throw error;
      }
      console.error('Error updating article category:', error);
      throw new InternalServerErrorException('서버 오류가 발생했습니다.');
    } finally {
      connection.release();
    }
  }

  async renameCategory(userId: number, categoryId: number, name: string) {
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      throw new BadRequestException('카테고리 이름을 입력해주세요.');
    }

    try {
      const [updateResult]: any = await this.dbPool.query(
        'UPDATE tn_user_saved_article_categories SET name = ? WHERE id = ? AND user_id = ?',
        [name.trim(), categoryId, userId],
      );

      if (updateResult.affectedRows === 0) {
        throw new ForbiddenException(
          '자신의 카테고리가 아니거나, 카테고리를 찾을 수 없습니다.',
        );
      }

      return { message: '카테고리 이름이 변경되었습니다.' };
    } catch (error: any) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      if (error.code === 'ER_DUP_ENTRY') {
        throw new ConflictException('이미 사용 중인 카테고리 이름입니다.');
      }
      console.error('Error renaming category:', error);
      throw new InternalServerErrorException('서버 오류가 발생했습니다.');
    }
  }

  async deleteCategory(userId: number, categoryId: number) {
    const connection = await this.dbPool.getConnection();
    try {
      await connection.beginTransaction();

      await connection.query(
        'UPDATE tn_user_saved_articles SET category_id = NULL WHERE user_id = ? AND category_id = ?',
        [userId, categoryId],
      );

      const [deleteResult]: any = await connection.query(
        'DELETE FROM tn_user_saved_article_categories WHERE id = ? AND user_id = ?',
        [categoryId, userId],
      );

      if (deleteResult.affectedRows === 0) {
        throw new ForbiddenException(
          '자신의 카테고리가 아니거나, 카테고리를 찾을 수 없습니다.',
        );
      }

      await connection.commit();
      return { message: '카테고리가 삭제되었습니다.' };
    } catch (error) {
      await connection.rollback();
      if (error instanceof ForbiddenException) {
        throw error;
      }
      console.error('Error deleting category:', error);
      throw new InternalServerErrorException('서버 오류가 발생했습니다.');
    } finally {
      connection.release();
    }
  }
}