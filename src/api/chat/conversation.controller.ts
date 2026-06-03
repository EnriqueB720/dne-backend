import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ConversationService } from './conversation.service';
import {
  CreateConversationDto,
  UpdateConversationDto,
  SendMessageDto,
} from './dto';

/**
 * REST surface kept for backwards compatibility (guest / deviceId-based
 * clients that haven't migrated to the GraphQL flow yet). New work should
 * use the AiConversationResolver, which is auth-aware.
 */
@Controller('chat/conversations')
export class ConversationController {
  constructor(private readonly convService: ConversationService) {}

  @Get()
  list(@Headers('x-device-id') deviceId: string) {
    return this.convService.listConversations({ deviceId: deviceId ?? '' });
  }

  @Post()
  create(@Body() dto: CreateConversationDto) {
    return this.convService.createConversation(dto, { deviceId: dto.deviceId });
  }

  @Get(':id')
  getOne(@Param('id') id: string, @Headers('x-device-id') deviceId: string) {
    return this.convService.getConversation(id, { deviceId: deviceId ?? '' });
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Headers('x-device-id') deviceId: string,
    @Body() dto: UpdateConversationDto,
  ) {
    return this.convService.updateConversation(
      id,
      { deviceId: deviceId ?? '' },
      dto,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Headers('x-device-id') deviceId: string) {
    return this.convService.deleteConversation(id, {
      deviceId: deviceId ?? '',
    });
  }

  @Post(':id/messages')
  sendMessage(
    @Param('id') id: string,
    @Headers('x-device-id') deviceId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.convService.sendMessage(id, { deviceId: deviceId ?? '' }, dto);
  }

  @Get(':id/messages')
  getMessages(
    @Param('id') id: string,
    @Headers('x-device-id') deviceId: string,
  ) {
    return this.convService.getMessages(id, { deviceId: deviceId ?? '' });
  }

  @Patch(':id/messages/:msgId')
  updateMessageProviders(
    @Param('id') id: string,
    @Param('msgId') msgId: string,
    @Headers('x-device-id') deviceId: string,
    @Body('providersJson') providersJson: string,
  ) {
    return this.convService.updateMessageProviders(
      id,
      msgId,
      { deviceId: deviceId ?? '' },
      providersJson,
    );
  }
}
