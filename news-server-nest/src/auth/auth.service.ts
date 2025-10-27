import {
  Injectable,
  Inject,
  ConflictException,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { DB_CONNECTION_POOL } from '../database/database.constants';
import type { Pool } from 'mysql2/promise';
import { SignUpDto } from './dto/sign-up.dto';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @Inject(DB_CONNECTION_POOL) private dbPool: Pool,
    private jwtService: JwtService,
  ) {}

  async signUp(signUpDto: SignUpDto): Promise<{ message: string }> {
    const { email, password, name, nickname, phone } = signUpDto;

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    try {
      await this.dbPool.query(
        'INSERT INTO tn_user (email, password, name, nickname, phone) VALUES (?, ?, ?, ?, ?)',
        [email, hashedPassword, name, nickname, phone || null],
      );
      return { message: 'User successfully registered' };
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        throw new ConflictException('이미 사용 중인 이메일 또는 닉네임입니다.');
      }
      throw new InternalServerErrorException(
        'An error occurred while signing up.',
      );
    }
  }

  async login(loginDto: LoginDto): Promise<{ accessToken: string }> {
    const { email, password } = loginDto;

    const [rows]: any = await this.dbPool.query(
      'SELECT * FROM tn_user WHERE email = ?',
      [email],
    );
    const user = rows[0];

    if (!user) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');
    }

    const payload = { userId: user.id, email: user.email };
    const accessToken = this.jwtService.sign(payload);

    return { accessToken };
  }
}
