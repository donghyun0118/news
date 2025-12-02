import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({
    description: '생성할 카테고리 이름',
    example: '나중에 읽을 기사',
  })
  @IsString()
  @IsNotEmpty({ message: '카테고리 이름을 입력해주세요.' })
  name: string;
}
