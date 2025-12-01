import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min, ValidateIf } from 'class-validator';

export class UpdateSavedArticleDto {
  @ApiProperty({
    description:
      '변경할 카테고리 ID입니다. null을 전달하면 카테고리에서 제외됩니다.',
    nullable: true,
    required: false,
    type: Number,
    example: 3,
  })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsInt({ message: '카테고리 ID는 숫자여야 합니다.' })
  @Min(1, { message: '카테고리 ID는 1 이상의 값이어야 합니다.' })
  categoryId?: number | null;
}
