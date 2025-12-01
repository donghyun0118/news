import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MinLength } from 'class-validator';

const PASSWORD_REGEX =
  /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{10,16}$/;

export class ChangePasswordDto {
  @ApiProperty({
    description: '현재 비밀번호',
    example: 'CurrentPass123!',
  })
  @IsString()
  @MinLength(1, { message: '현재 비밀번호를 입력해주세요.' })
  currentPassword: string;

  @ApiProperty({
    description: '새 비밀번호',
    example: 'NewPass123!',
  })
  @IsString()
  @Matches(PASSWORD_REGEX, {
    message: '새 비밀번호는 영문+숫자+특수문자 10~16자리로 입력해주세요.',
  })
  newPassword: string;

  @ApiProperty({
    description: '새 비밀번호 확인',
    example: 'NewPass123!',
  })
  @IsString()
  @MinLength(1, { message: '새 비밀번호 확인을 입력해주세요.' })
  newPassword_confirmation: string;
}
