import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CollectLatestDto {
  @ApiProperty({ description: '검색 키워드', example: '선거' })
  @IsString()
  @IsNotEmpty()
  keywords!: string;
}
