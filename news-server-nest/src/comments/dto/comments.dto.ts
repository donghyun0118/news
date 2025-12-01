import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export enum UserVoteSide {
  LEFT = 'LEFT',
  RIGHT = 'RIGHT',
}

export enum ReactionType {
  LIKE = 'LIKE',
  DISLIKE = 'DISLIKE',
}

export class CreateCommentDto {
  @ApiProperty({ description: '댓글 내용' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({ description: '부모 댓글 ID (대댓글인 경우)' })
  @IsOptional()
  @IsInt()
  parentCommentId?: number;

  @ApiProperty({ description: '작성자의 투표 성향', enum: UserVoteSide })
  @IsEnum(UserVoteSide)
  @IsNotEmpty()
  userVoteSide: UserVoteSide;
}

export class UpdateCommentDto {
  @ApiProperty({ description: '수정할 댓글 내용' })
  @IsString()
  @IsNotEmpty()
  content: string;
}

export class ToggleReactionDto {
  @ApiProperty({ description: '반응 타입', enum: ReactionType })
  @IsEnum(ReactionType)
  @IsNotEmpty()
  reactionType: ReactionType;
}

export class ReportCommentDto {
  @ApiProperty({ description: '신고 사유' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}
