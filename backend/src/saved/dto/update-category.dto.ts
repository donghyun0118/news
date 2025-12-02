import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateCategoryDto {
  @ApiProperty({
    description: '변경할 카테고리 이름',
    example: '중요 기사',
  })
  @IsString()
  @IsNotEmpty({ message: '카테고리 이름을 입력해주세요.' })
  name: string;
}
