import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import type { Pool, RowDataPacket } from 'mysql2/promise';
import { DB_CONNECTION_POOL } from '../database/database.constants';
import { SignUpDto } from './dto/sign-up.dto';
import { LoginDto } from './dto/login.dto';
import type { SignOptions } from 'jsonwebtoken';

type ExistingUserRow = RowDataPacket & {
  email: string;
  nickname: string;
  phone: string | null;
};

@Injectable()
export class AuthService {
  constructor(
    @Inject(DB_CONNECTION_POOL) private readonly dbPool: Pool,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async signUp(signUpDto: SignUpDto): Promise<{ message: string }> {
    if (signUpDto.password !== signUpDto.password_confirmation) {
      throw new BadRequestException({
        field: 'password_confirmation',
        message: '비밀번호가 일치하지 않습니다.',
      });
    }

    const trimmedName = signUpDto.name.trim();
    const trimmedNickname = signUpDto.nickname.trim();
    const trimmedEmail = signUpDto.email.trim();
    const trimmedPhone = signUpDto.phone.trim();
    const normalizedPhone = trimmedPhone.length > 0 ? trimmedPhone : null;

    try {
      const [existingUsers] = await this.dbPool.query<ExistingUserRow[]>(
        'SELECT email, nickname, phone FROM tn_user WHERE email = ? OR nickname = ? OR phone = ?',
        [trimmedEmail, trimmedNickname, normalizedPhone],
      );

      if (existingUsers.length > 0) {
        const emailExists = existingUsers.some(
          (row) => row.email === trimmedEmail,
        );
        if (emailExists) {
          throw new ConflictException({
            message: '이미 사용 중인 이메일입니다.',
          });
        }

        const nicknameExists = existingUsers.some(
          (row) => row.nickname === trimmedNickname,
        );
        if (nicknameExists) {
          throw new ConflictException({
            message: '이미 사용 중인 닉네임입니다.',
          });
        }

        const phoneExists = existingUsers.some(
          (row) => row.phone === normalizedPhone,
        );
        if (phoneExists) {
          throw new ConflictException({
            message: '이미 등록된 휴대폰번호입니다.',
          });
        }

        throw new ConflictException({
          message: '이미 등록된 사용자 정보가 존재합니다.',
        });
      }

      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(signUpDto.password, saltRounds);
      const defaultProfileImageUrl = '/public/avatars/default.svg';

      await this.dbPool.query(
        'INSERT INTO tn_user (name, nickname, email, password, phone, profile_image_url) VALUES (?, ?, ?, ?, ?, ?)',
        [
          trimmedName,
          trimmedNickname,
          trimmedEmail,
          passwordHash,
          normalizedPhone,
          defaultProfileImageUrl,
        ],
      );

      return { message: '회원가입이 완료되었습니다.' };
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      console.error('Error during signup:', error);
      throw new InternalServerErrorException({
        message: '서버 오류가 발생했습니다.',
      });
    }
  }

  async login(
    loginDto: LoginDto,
    baseUrl: string,
  ): Promise<{
    token: string;
    user: {
      id: number;
      name: string;
      email: string;
      nickname: string;
      profile_image_url: string | null;
    };
  }> {
    const { email, password } = loginDto;

    try {
      const [rows]: any = await this.dbPool.query(
        'SELECT * FROM tn_user WHERE email = ?',
        [email],
      );

      if (rows.length === 0) {
        throw new UnauthorizedException({
          message: '이메일 또는 비밀번호가 올바르지 않습니다.',
        });
      }

      const user = rows[0];
      const isPasswordCorrect = await bcrypt.compare(
        password,
        user.password,
      );

      if (!isPasswordCorrect) {
        throw new UnauthorizedException({
          message: '이메일 또는 비밀번호가 올바르지 않습니다.',
        });
      }

      if (user.status === 'DELETED') {
        throw new UnauthorizedException({
          message: '탈퇴한 계정입니다.',
        });
      }
      if (user.status === 'SUSPENDED') {
        throw new UnauthorizedException({
          message: '이용이 제한된 계정입니다.',
        });
      }

      const rawExpiresIn =
        this.configService.get<string>('USER_JWT_EXPIRES_IN') ||
        this.configService.get<string>('ADMIN_JWT_EXPIRES_IN') ||
        '5m';

      const expiresIn: SignOptions['expiresIn'] = /^\d+$/.test(
        rawExpiresIn,
      )
        ? Number(rawExpiresIn)
        : (rawExpiresIn as SignOptions['expiresIn']);

      const payload = { userId: user.id, name: user.name };
      const signOptions: JwtSignOptions = { expiresIn };
      const token = this.jwtService.sign(payload, signOptions);

      const profileImageUrl = user.profile_image_url
        ? `${baseUrl}${user.profile_image_url}`
        : null;

      return {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          nickname: user.nickname,
          profile_image_url: profileImageUrl,
        },
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      console.error('Error during login:', error);
      throw new InternalServerErrorException({
        message: '서버 오류가 발생했습니다.',
      });
    }
  }
}
