import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Matches, MinLength } from 'class-validator';

const PASSWORD_REGEX =
  /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{10,16}$/;
const NAME_REGEX = /^[a-zA-Z가-힣]{2,}$/;
const NICKNAME_REGEX = /^[a-zA-Z0-9가-힣]{3,10}$/;
const PHONE_REGEX = /^\d+$/;

export class SignUpDto {
  @ApiProperty({
    description: '사용자 이메일 주소',
    example: 'gildong@example.com',
  })
  @IsEmail({}, { message: '이메일 형식이 맞지 않습니다.' })
  email: string;

  @ApiProperty({
    description: '로그인에 사용할 비밀번호',
    example: 'Password123!',
  })
  @IsString()
  @Matches(PASSWORD_REGEX, {
    message: '영문+숫자+특수문자 10~16자리로 입력해주세요.',
  })
  password: string;

  @ApiProperty({
    description: '비밀번호 확인',
    example: 'Password123!',
  })
  @IsString()
  @MinLength(1, { message: '비밀번호 확인을 입력해주세요.' })
  password_confirmation: string;

  @ApiProperty({ description: '사용자 이름', example: '홍길동' })
  @IsString()
  @Matches(NAME_REGEX, {
    message: '이름은 2자 이상이며 영문 또는 한글만 입력 가능합니다.',
  })
  name: string;

  @ApiProperty({ description: '사용자 닉네임', example: 'gildong_hong' })
  @IsString()
  @Matches(NICKNAME_REGEX, {
    message: '닉네임은 3~10자의 영문, 한글, 숫자만 사용할 수 있습니다.',
  })
  nickname: string;

  @ApiProperty({
    description: '휴대폰번호 (숫자만)',
    example: '01012345678',
  })
  @IsString()
  @Matches(PHONE_REGEX, {
    message: '휴대폰번호를 숫자로 입력해주세요.',
  })
  phone: string;
}
