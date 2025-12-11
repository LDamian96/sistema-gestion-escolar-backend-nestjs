import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import configuration from './config/configuration';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { StudentsModule } from './modules/students/students.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { TeachersModule } from './modules/teachers/teachers.module';
import { ParentsModule } from './modules/parents/parents.module';
import { CoursesModule } from './modules/courses/courses.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { GradesModule } from './modules/grades/grades.module';
import { EnrollmentsModule } from './modules/enrollments/enrollments.module';
import { WorkshopsModule } from './modules/workshops/workshops.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { SchedulesModule } from './modules/schedules/schedules.module';
import { CurriculumModule } from './modules/curriculum/curriculum.module';
import { GradeLevelsModule } from './modules/grade-levels/grade-levels.module';
import { SectionsModule } from './modules/sections/sections.module';
import { SubjectsModule } from './modules/subjects/subjects.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';

@Module({
  imports: [
    // Configuración global
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),

    // Rate limiting (protección DDoS)
    ThrottlerModule.forRoot([
      {
        ttl: parseInt(process.env.THROTTLE_TTL || '60000', 10), // 1 minuto
        limit: parseInt(process.env.THROTTLE_LIMIT || '60', 10), // 60 requests por minuto
      },
    ]),

    // Database
    DatabaseModule,

    // Auth
    AuthModule,

    // Módulos de negocio
    StudentsModule,
    TeachersModule,
    ParentsModule,
    PaymentsModule,
    CoursesModule,
    AttendanceModule,
    TasksModule,
    GradesModule,
    EnrollmentsModule,
    WorkshopsModule,
    AnalyticsModule,
    SchedulesModule,
    CurriculumModule,
    GradeLevelsModule,
    SectionsModule,
    SubjectsModule,
    UploadsModule,
  ],
  providers: [
    // Rate limiting global
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    // Filtros globales
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_FILTER,
      useClass: PrismaExceptionFilter,
    },
    // Interceptores globales
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
})
export class AppModule {}
