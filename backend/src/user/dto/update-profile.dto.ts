import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

const NICKNAME_REGEX = /^[a-zA-Z0-9가-힣]{3,10}$/;

export class UpdateProfileDto {
  @ApiPropertyOptional({
    description: '변경할 닉네임 (3~10자의 영문, 한글, 숫자)',
    example: 'string',
  })
  @IsOptional()
  @IsString()
  @Matches(NICKNAME_REGEX, {
    message: '닉네임은 3~10자의 영문, 한글, 숫자만 사용할 수 있습니다.',
  })
  nickname?: string;

  @ApiPropertyOptional({
    description: '변경할 프로필 이미지 URL',
    example: 'string',
  })
  @IsOptional()
  @IsString({ message: '올바른 프로필 이미지 URL이 아닙니다.' })
  profile_image_url?: string;

  @ApiPropertyOptional({
    description: '소개글 (최대 255자)',
    example: '안녕하세요.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255, { message: '자기소개는 255자 이하로 입력해주세요.' })
  introduction?: string;
}
