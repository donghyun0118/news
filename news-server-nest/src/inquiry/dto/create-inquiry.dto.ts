import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class CreateInquiryDto {
  @ApiProperty({
    description: '문의 주제',
    example: '서비스 이용 관련 문의',
  })
  @IsString()
  @IsNotEmpty({ message: '문의 주제를 입력해주세요.' })
  subject: string;

  @ApiProperty({
    description: '문의 내용',
    example: '이용 중 궁금한 점이 있어 문의드립니다.',
  })
  @IsString()
  @IsNotEmpty({ message: '문의 내용을 입력해주세요.' })
  content: string;

  @ApiProperty({
    description: '개인정보 수집 및 이용 동의 여부 (항상 "true")',
    example: 'true',
  })
  @IsString()
  @Matches(/^true$/, {
    message: '개인정보 수집 및 이용에 동의해야 합니다.',
  })
  privacy_agreement: string;
}
