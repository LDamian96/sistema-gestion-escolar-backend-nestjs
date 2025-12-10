import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../../generated/prisma';

@ApiTags('Analytics')
@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @Roles(Role.ADMIN)
  getDashboard(@CurrentUser('schoolId') schoolId: string) {
    return this.analyticsService.getDashboard(schoolId);
  }

  @Get('attendance')
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  getAttendanceStats(
    @CurrentUser('schoolId') schoolId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.analyticsService.getAttendanceStats(
      schoolId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('top-students')
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiQuery({ name: 'limit', required: false })
  getTopStudents(
    @CurrentUser('schoolId') schoolId: string,
    @Query('limit') limit?: number,
  ) {
    return this.analyticsService.getTopStudents(schoolId, limit || 10);
  }

  @Get('payments')
  @Roles(Role.ADMIN)
  getPaymentStats(@CurrentUser('schoolId') schoolId: string) {
    return this.analyticsService.getPaymentStats(schoolId);
  }

  @Get('courses')
  @Roles(Role.ADMIN, Role.TEACHER)
  getCoursesReport(@CurrentUser('schoolId') schoolId: string) {
    return this.analyticsService.getCoursesReport(schoolId);
  }
}
