import { IsIn, IsString, MaxLength } from 'class-validator';

export type ChatRole = 'user' | 'assistant';

export class ChatMessageDto {
  @IsIn(['user', 'assistant'])
  role: ChatRole;

  @IsString()
  @MaxLength(8000)
  content: string;
}
