import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ReplyInquiryDto {
  @ApiProperty({
    description: '답변 내용',
    example: '문의하신 내용에 대한 답변입니다.',
  })
  @IsString()
  @IsNotEmpty()
  content!: string;
}
