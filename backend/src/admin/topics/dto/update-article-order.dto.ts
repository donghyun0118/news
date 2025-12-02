import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsNumber } from 'class-validator';

export class UpdateArticleOrderDto {
  @ApiProperty({
    description: '기사 ID 배열 (순서대로)',
    example: [1, 2, 3],
    type: [Number],
  })
  @IsArray()
  @IsNumber({}, { each: true })
  @IsNotEmpty()
  articleIds!: number[];
}
