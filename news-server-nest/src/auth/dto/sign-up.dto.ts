import {
  IsEmail,
  IsOptional,
  IsPhoneNumber,
  IsString,
  MinLength,
} from 'class-validator';

export class SignUpDto {
  @IsEmail({}, { message: '유효한 이메일 주소를 입력해주세요.' })
  email: string;

  @IsString()
  @MinLength(8, { message: '비밀번호는 최소 8자 이상이어야 합니다.' })
  password: string;

  @IsString()
  name: string;

  @IsString()
  nickname: string;

  @IsOptional()
  @IsPhoneNumber('KR', {
    message: '유효한 대한민국 휴대폰 번호를 입력해주세요.',
  })
  phone?: string;
}
