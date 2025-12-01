import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateKeywordDto {
  @ApiProperty({ description: '키워드', example: '선거' })
  @IsString()
  @IsNotEmpty()
  keyword!: string;
}

export class UpdateKeywordDto {
  @ApiProperty({ description: '키워드', example: '총선' })
  @IsString()
  @IsNotEmpty()
  keyword!: string;
}
