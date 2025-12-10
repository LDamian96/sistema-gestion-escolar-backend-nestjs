import { ArgumentsHost, Catch, HttpStatus } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Prisma } from '../../../generated/prisma';
import { Response } from 'express';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter extends BaseExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const message = exception.message.replace(/\n/g, '');

    switch (exception.code) {
      case 'P2002': {
        // Violación de constraint único
        const status = HttpStatus.CONFLICT;
        response.status(status).json({
          statusCode: status,
          message: 'El registro ya existe (campo único duplicado)',
          error: 'Conflict',
        });
        break;
      }
      case 'P2014': {
        // Violación de relación requerida
        const status = HttpStatus.BAD_REQUEST;
        response.status(status).json({
          statusCode: status,
          message: 'La operación viola una relación requerida',
          error: 'Bad Request',
        });
        break;
      }
      case 'P2003': {
        // Violación de foreign key
        const status = HttpStatus.BAD_REQUEST;
        response.status(status).json({
          statusCode: status,
          message: 'Referencia inválida (foreign key)',
          error: 'Bad Request',
        });
        break;
      }
      case 'P2025': {
        // Registro no encontrado
        const status = HttpStatus.NOT_FOUND;
        response.status(status).json({
          statusCode: status,
          message: 'Registro no encontrado',
          error: 'Not Found',
        });
        break;
      }
      default:
        // Error desconocido de Prisma
        super.catch(exception, host);
        break;
    }
  }
}
