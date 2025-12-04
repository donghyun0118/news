import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';

export enum VoteSide {
  LEFT = 'LEFT',
  RIGHT = 'RIGHT',
}

export class VoteDto {
  @ApiProperty({
    description: '투표할 진영 (LEFT: 진보/좌측, RIGHT: 보수/우측)',
    example: 'LEFT',
    enum: VoteSide,
    required: true,
  })
  @IsEnum(VoteSide, { message: 'side는 LEFT 또는 RIGHT여야 합니다.' })
  @IsNotEmpty()
  side!: VoteSide;
}
