import { IsEnum, IsNotEmpty } from 'class-validator';

export class SaveArticleDto {
  @IsNotEmpty()
  @IsEnum(['home', 'topic'], { message: "articleType must be either 'home' or 'topic'." })
  articleType: 'home' | 'topic';
}
