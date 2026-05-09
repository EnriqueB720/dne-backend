import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ConversationService } from './conversation.service';
import {
  CreateConversationDto,
  UpdateConversationDto,
  SendMessageDto,
} from './dto';

@Controller('chat/conversations')
export class ConversationController {
  constructor(private readonly convService: ConversationService) {}

  /** List all conversations for a device */
  @Get()
  list(@Headers('x-device-id') deviceId: string) {
    return this.convService.listConversations(deviceId ?? '');
  }

  /** Create a new conversation */
  @Post()
  create(@Body() dto: CreateConversationDto) {
    return this.convService.createConversation(dto);
  }

  /** Get a single conversation (with all messages) */
  @Get(':id')
  getOne(
    @Param('id') id: string,
    @Headers('x-device-id') deviceId: string,
  ) {
    return this.convService.getConversation(id, deviceId ?? '');
  }

  /** Update conversation title or model */
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Headers('x-device-id') deviceId: string,
    @Body() dto: UpdateConversationDto,
  ) {
    return this.convService.updateConversation(id, deviceId ?? '', dto);
  }

  /** Hard-delete a conversation and all its messages */
  @Delete(':id')
  remove(
    @Param('id') id: string,
    @Headers('x-device-id') deviceId: string,
  ) {
    return this.convService.deleteConversation(id, deviceId ?? '');
  }

  /** Send a user message and get the AI reply */
  @Post(':id/messages')
  sendMessage(
    @Param('id') id: string,
    @Headers('x-device-id') deviceId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.convService.sendMessage(id, deviceId ?? '', dto);
  }

  /** Fetch all messages in a conversation */
  @Get(':id/messages')
  getMessages(
    @Param('id') id: string,
    @Headers('x-device-id') deviceId: string,
  ) {
    return this.convService.getMessages(id, deviceId ?? '');
  }

  /** Persist provider cards JSON onto a specific message */
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
      deviceId ?? '',
      providersJson,
    );
  }
}
