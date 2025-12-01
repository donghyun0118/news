import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Pool } from 'mysql2/promise';
import { DB_CONNECTION_POOL } from '../../database/database.constants';
import { UpdateUserStatusDto } from '../dto/update-user-status.dto';

@Injectable()
export class AdminUsersService {
  constructor(@Inject(DB_CONNECTION_POOL) private readonly dbPool: Pool) {}

  async findAll(page: number, limit: number, search?: string) {
    const offset = (page - 1) * limit;
    let query = 'SELECT * FROM tn_user';
    let countQuery = 'SELECT COUNT(*) as total FROM tn_user';
    const params: any[] = [];

    if (search) {
      const searchCondition = ' WHERE email LIKE ? OR nickname LIKE ?';
      query += searchCondition;
      countQuery += searchCondition;
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [rows]: any = await this.dbPool.query(query, params);
    const [countRows]: any = await this.dbPool.query(
      countQuery,
      params.slice(0, 2),
    ); // search params only

    return {
      users: rows,
      total: countRows[0].total,
      page,
      limit,
    };
  }

  async findOne(userId: number) {
    const [rows]: any = await this.dbPool.query(
      'SELECT * FROM tn_user WHERE id = ?',
      [userId],
    );

    if (rows.length === 0) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    return rows[0];
  }

  async updateStatus(userId: number, dto: UpdateUserStatusDto) {
    const { status, warning_count } = dto;
    const updates: string[] = [];
    const params: any[] = [];

    if (status) {
      updates.push('status = ?');
      params.push(status);
    }

    if (warning_count !== undefined) {
      updates.push('warning_count = ?');
      params.push(warning_count);
    }

    if (updates.length === 0) {
      return { message: '변경 사항이 없습니다.' };
    }

    const query = `UPDATE tn_user SET ${updates.join(', ')} WHERE id = ?`;
    params.push(userId);

    const [result]: any = await this.dbPool.query(query, params);

    if (result.affectedRows === 0) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    return { message: '사용자 정보가 업데이트되었습니다.' };
  }

  async getComments(userId: number) {
    const [rows]: any = await this.dbPool.query(
      `SELECT c.*, t.title as topic_title
       FROM tn_comment c
       JOIN tn_topic t ON c.topic_id = t.id
       WHERE c.user_id = ?
       ORDER BY c.created_at DESC`,
      [userId],
    );
    return rows;
  }

  async getChats(userId: number) {
    const [rows]: any = await this.dbPool.query(
      `SELECT c.*, t.title as topic_title
       FROM tn_chat c
       JOIN tn_topic t ON c.topic_id = t.id
       WHERE c.user_id = ?
       ORDER BY c.created_at DESC`,
      [userId],
    );
    return rows;
  }
}
