import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global() // Hace que PrismaService esté disponible en toda la app sin importarlo
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class DatabaseModule {}
