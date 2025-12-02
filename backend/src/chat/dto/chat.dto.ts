import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateChatMessageDto {
  @ApiProperty({
    description: '메시지 내용 (1000자 이하)',
    example: '안녕하세요!',
  })
  @IsString()
  @IsNotEmpty({ message: '메시지 내용이 비어있습니다.' })
  @MaxLength(1000, { message: '메시지는 1000자 이하로 입력해주세요.' })
  content: string;
}

export class ReportChatMessageDto {
  @ApiPropertyOptional({ description: '신고 사유' })
  @IsString()
  reason?: string;
}

export class CreatePresignedUrlDto {
  @ApiProperty({
    description: '업로드할 파일의 원본 이름',
    example: 'my-image.png',
  })
  @IsString()
  @IsNotEmpty()
  fileName: string;

  @ApiProperty({
    description: '업로드할 파일의 MIME 타입',
    example: 'image/png',
  })
  @IsString()
  @IsNotEmpty()
  fileType: string;
}
