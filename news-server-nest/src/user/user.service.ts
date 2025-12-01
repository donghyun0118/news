import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import * as fs from 'fs';
import type { Pool } from 'mysql2/promise';
import { join } from 'path';
import { DB_CONNECTION_POOL } from '../database/database.constants';
import { ChangePasswordDto } from './dto/change-password.dto';
import {
  NotificationSettingDto,
  NotificationType,
} from './dto/notification-setting.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UserService {
  private static readonly NOTIFICATION_TYPES = [
    NotificationType.NEW_TOPIC,
    NotificationType.BREAKING_NEWS,
    NotificationType.EXCLUSIVE_NEWS,
    NotificationType.VOTE_REMINDER,
    NotificationType.ADMIN_NOTICE,
  ];

  constructor(@Inject(DB_CONNECTION_POOL) private readonly dbPool: Pool) {}

  async getAvatars(baseUrl: string): Promise<string[]> {
    const avatarDir = join(process.cwd(), 'public', 'avatars');
    try {
      if (!fs.existsSync(avatarDir)) {
        fs.mkdirSync(avatarDir, { recursive: true });
        return [];
      }

      const files = fs.readdirSync(avatarDir);
      return files.map((file) => `${baseUrl}/public/avatars/${file}`);
    } catch (error) {
      console.error('Error reading avatars directory:', error);
      throw new InternalServerErrorException({
        message: '아바타 목록을 불러오는 중 오류가 발생했습니다.',
      });
    }
  }

  async getProfile(userId: number, baseUrl: string) {
    try {
      const [rows]: any = await this.dbPool.query(
        'SELECT email, name, nickname, phone, profile_image_url, introduction FROM tn_user WHERE id = ? AND status = "ACTIVE"',
        [userId],
      );

      if (rows.length === 0) {
        throw new NotFoundException({ message: '사용자를 찾을 수 없습니다.' });
      }

      const user = rows[0];
      if (user.profile_image_url) {
        user.profile_image_url = `${baseUrl}${user.profile_image_url}`;
      }
      return user;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('Error fetching user profile:', error);
      throw new InternalServerErrorException({
        message: '서버 오류가 발생했습니다.',
      });
    }
  }

  async updateProfile(
    userId: number,
    updateProfileDto: UpdateProfileDto,
    baseUrl: string,
  ): Promise<{ message: string }> {
    const { nickname, introduction } = updateProfileDto;
    let profileImageUrl = updateProfileDto.profile_image_url?.trim();

    if (!nickname && !profileImageUrl && typeof introduction === 'undefined') {
      throw new BadRequestException({
        message: '변경할 정보를 입력해주세요.',
      });
    }

    if (profileImageUrl) {
      try {
        const parsed = new URL(profileImageUrl);
        profileImageUrl = parsed.pathname;
      } catch {
        // ignore, keep original relative path
      }

      const avatarDir = join(process.cwd(), 'public', 'avatars');
      if (!fs.existsSync(avatarDir)) {
        throw new BadRequestException({
          field: 'profile_image_url',
          message: '올바른 프로필 이미지가 아닙니다.',
        });
      }
      const files = fs.readdirSync(avatarDir);
      const validUrls = files.map((file) => `/public/avatars/${file}`);
      if (!validUrls.includes(profileImageUrl)) {
        throw new BadRequestException({
          field: 'profile_image_url',
          message: '올바른 프로필 이미지가 아닙니다.',
        });
      }
    }

    try {
      if (nickname) {
        const [existingUsers]: any = await this.dbPool.query(
          'SELECT id FROM tn_user WHERE nickname = ? AND id != ?',
          [nickname, userId],
        );
        if (existingUsers.length > 0) {
          throw new ConflictException({
            field: 'nickname',
            message: '이미 사용 중인 닉네임입니다.',
          });
        }
      }

      const fieldsToUpdate: string[] = [];
      const params: Array<string | number | null> = [];

      if (nickname) {
        fieldsToUpdate.push('nickname = ?');
        params.push(nickname);
      }
      if (profileImageUrl) {
        fieldsToUpdate.push('profile_image_url = ?');
        params.push(profileImageUrl);
      }
      if (typeof introduction !== 'undefined') {
        fieldsToUpdate.push('introduction = ?');
        params.push(introduction);
      }

      if (fieldsToUpdate.length === 0) {
        throw new BadRequestException({
          message: '변경할 정보를 입력해주세요.',
        });
      }

      params.push(userId);
      const query = `UPDATE tn_user SET ${fieldsToUpdate.join(
        ', ',
      )} WHERE id = ?`;
      await this.dbPool.query(query, params);

      return { message: '프로필 정보가 성공적으로 업데이트되었습니다.' };
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      console.error('Error updating user profile:', error);
      throw new InternalServerErrorException({
        message: '서버 오류가 발생했습니다.',
      });
    }
  }

  async changePassword(
    userId: number,
    changePasswordDto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    const { currentPassword, newPassword, newPassword_confirmation } =
      changePasswordDto;

    if (newPassword !== newPassword_confirmation) {
      throw new BadRequestException({
        field: 'newPassword_confirmation',
        message: '새 비밀번호가 일치하지 않습니다.',
      });
    }

    try {
      const [users]: any = await this.dbPool.query(
        'SELECT password FROM tn_user WHERE id = ?',
        [userId],
      );

      if (users.length === 0) {
        throw new NotFoundException({ message: '사용자를 찾을 수 없습니다.' });
      }

      const user = users[0];
      const isPasswordCorrect = await bcrypt.compare(
        currentPassword,
        user.password,
      );
      if (!isPasswordCorrect) {
        throw new UnauthorizedException({
          field: 'currentPassword',
          message: '현재 비밀번호가 일치하지 않습니다.',
        });
      }

      const saltRounds = 10;
      const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);
      await this.dbPool.query('UPDATE tn_user SET password = ? WHERE id = ?', [
        newPasswordHash,
        userId,
      ]);

      return { message: '비밀번호가 성공적으로 변경되었습니다.' };
    } catch (error) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      console.error('Error changing password:', error);
      throw new InternalServerErrorException({
        message: '서버 오류가 발생했습니다.',
      });
    }
  }

  async deleteAccount(
    userId: number,
    password: string,
  ): Promise<{ message: string }> {
    try {
      const [users]: any = await this.dbPool.query(
        'SELECT password FROM tn_user WHERE id = ?',
        [userId],
      );

      if (users.length === 0) {
        throw new NotFoundException({ message: '사용자를 찾을 수 없습니다.' });
      }

      const user = users[0];
      const isPasswordCorrect = await bcrypt.compare(password, user.password);
      if (!isPasswordCorrect) {
        throw new UnauthorizedException({
          field: 'password',
          message: '비밀번호가 일치하지 않습니다.',
        });
      }

      await this.dbPool.query(
        "UPDATE tn_user SET status = 'DELETED' WHERE id = ?",
        [userId],
      );
      return { message: '회원 탈퇴 처리가 완료되었습니다.' };
    } catch (error) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      console.error('Error deleting user account:', error);
      throw new InternalServerErrorException({
        message: '서버 오류가 발생했습니다.',
      });
    }
  }

  async getNotificationSettings(userId: number) {
    try {
      const [rows]: any = await this.dbPool.query(
        'SELECT notification_type, is_enabled FROM tn_user_notification_settings WHERE user_id = ?',
        [userId],
      );

      const settingsMap = new Map<string, boolean>(
        rows.map((row: { notification_type: string; is_enabled: number }) => [
          row.notification_type, // This is correct, coming from DB
          !!row.is_enabled,     // This is correct, coming from DB
        ]),
      );

      return UserService.NOTIFICATION_TYPES.map((type) => ({
        notificationType: type, // This needs to be camelCase for DTO
        isEnabled: settingsMap.has(type) ? settingsMap.get(type) : true, // This needs to be camelCase for DTO
      }));
    } catch (error) {
      console.error('Error fetching notification settings:', error);
      throw new InternalServerErrorException({
        message: '서버 오류가 발생했습니다.',
      });
    }
  }

  async updateNotificationSettings(
    userId: number,
    settings: NotificationSettingDto[],
  ): Promise<{ message: string }> {
    const connection = await this.dbPool.getConnection();
    try {
      await connection.beginTransaction();
      const query = `
        INSERT INTO tn_user_notification_settings (user_id, notification_type, is_enabled)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE is_enabled = VALUES(is_enabled)
      `;

      for (const setting of settings) {
        await connection.query(query, [
          userId,
          setting.notificationType, // DTO property name (camelCase)
          setting.isEnabled,      // DTO property name (camelCase)
        ]);
      }

      await connection.commit();
      return { message: 'Notification settings updated successfully.' };
    } catch (error) {
      await connection.rollback();
      console.error('Error updating notification settings:', error);
      throw new InternalServerErrorException({
        message: '서버 오류가 발생했습니다.',
      });
    } finally {
      connection.release();
    }
  }
}
