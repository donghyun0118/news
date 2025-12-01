import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class AdminLoginDto {
  @ApiProperty({ description: '관리자 아이디', example: 'admin' })
  @IsString()
  @IsNotEmpty()
  username!: string;

  @ApiProperty({ description: '관리자 비밀번호', example: 'password123' })
  @IsString()
  @IsNotEmpty()
  password!: string;
}
