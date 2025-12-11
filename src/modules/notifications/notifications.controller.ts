import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role, NotificationType } from '../../../generated/prisma';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener mis notificaciones' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'unreadOnly', required: false, type: Boolean })
  findAll(
    @CurrentUser('sub') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('unreadOnly') unreadOnly?: boolean,
  ) {
    return this.notificationsService.findAllForUser(userId, {
      page,
      limit,
      unreadOnly: unreadOnly === true || unreadOnly === 'true' as any,
    });
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Marcar una notificación como leída' })
  markAsRead(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.notificationsService.markAsRead(id, userId);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Marcar todas las notificaciones como leídas' })
  markAllAsRead(@CurrentUser('sub') userId: string) {
    return this.notificationsService.markAllAsRead(userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar una notificación' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.notificationsService.remove(id, userId);
  }

  @Delete('clear-read')
  @ApiOperation({ summary: 'Eliminar todas las notificaciones leídas' })
  removeAllRead(@CurrentUser('sub') userId: string) {
    return this.notificationsService.removeAllRead(userId);
  }

  // === ENDPOINTS PARA ADMIN (enviar notificaciones) ===

  @Post('broadcast')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Enviar anuncio a toda la escuela (Solo Admin)' })
  broadcast(
    @CurrentUser('schoolId') schoolId: string,
    @Body('title') title: string,
    @Body('message') message: string,
  ) {
    return this.notificationsService.broadcastAnnouncement(schoolId, title, message);
  }

  @Post('send')
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Enviar notificación a un usuario específico' })
  sendToUser(
    @CurrentUser('schoolId') schoolId: string,
    @Body('userId') userId: string,
    @Body('type') type: NotificationType,
    @Body('title') title: string,
    @Body('message') message: string,
  ) {
    return this.notificationsService.create({
      userId,
      schoolId,
      type,
      title,
      message,
    });
  }
}
