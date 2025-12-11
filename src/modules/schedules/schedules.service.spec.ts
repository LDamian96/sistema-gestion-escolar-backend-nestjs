import { Test, TestingModule } from '@nestjs/testing';
import { SchedulesService } from './schedules.service';
import { PrismaService } from '../../database/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('SchedulesService', () => {
  let service: SchedulesService;

  const mockPrismaService = {
    course: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    schedule: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    teacher: {
      findFirst: jest.fn(),
    },
    student: {
      findFirst: jest.fn(),
    },
    classroom: {
      findFirst: jest.fn(),
    },
    enrollment: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchedulesService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<SchedulesService>(SchedulesService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Time validation', () => {
    it('should reject invalid time format', async () => {
      mockPrismaService.course.findFirst.mockResolvedValue({
        id: 'course-1',
        teacher: { id: 'teacher-1' },
        classroom: { id: 'classroom-1' },
      });

      const createDto = {
        courseId: 'course-1',
        dayOfWeek: 1,
        startTime: '25:00', // Invalid
        endTime: '10:00',
      };

      await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
    });

    it('should reject if start time is after end time', async () => {
      mockPrismaService.course.findFirst.mockResolvedValue({
        id: 'course-1',
        teacher: { id: 'teacher-1' },
        classroom: { id: 'classroom-1' },
      });

      const createDto = {
        courseId: 'course-1',
        dayOfWeek: 1,
        startTime: '14:00',
        endTime: '10:00', // Before start
      };

      await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
    });

    it('should reject times outside reasonable hours (before 6:00)', async () => {
      mockPrismaService.course.findFirst.mockResolvedValue({
        id: 'course-1',
        teacher: { id: 'teacher-1' },
        classroom: { id: 'classroom-1' },
      });

      const createDto = {
        courseId: 'course-1',
        dayOfWeek: 1,
        startTime: '05:00', // Too early
        endTime: '07:00',
      };

      await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
    });

    it('should accept valid time format', async () => {
      mockPrismaService.course.findFirst.mockResolvedValue({
        id: 'course-1',
        teacher: { id: 'teacher-1' },
        classroom: { id: 'classroom-1' },
      });
      mockPrismaService.schedule.findMany.mockResolvedValue([]);
      mockPrismaService.schedule.create.mockResolvedValue({
        id: 'schedule-1',
        courseId: 'course-1',
        dayOfWeek: 1,
        startTime: '08:00',
        endTime: '09:00',
      });

      const createDto = {
        courseId: 'course-1',
        dayOfWeek: 1,
        startTime: '08:00',
        endTime: '09:00',
      };

      const result = await service.create(createDto);
      expect(result).toBeDefined();
      expect(mockPrismaService.schedule.create).toHaveBeenCalled();
    });
  });

  describe('Conflict detection', () => {
    const mockCourse = {
      id: 'course-1',
      teacher: { id: 'teacher-1', firstName: 'Juan', lastName: 'Pérez' },
      classroom: { id: 'classroom-1' },
    };

    beforeEach(() => {
      mockPrismaService.course.findFirst.mockResolvedValue(mockCourse);
    });

    it('should detect teacher conflict when schedules overlap', async () => {
      // Existing schedule: 08:00 - 09:00
      mockPrismaService.schedule.findMany.mockImplementation(({ where }) => {
        if (where.course?.teacherId) {
          return Promise.resolve([
            {
              id: 'existing-1',
              dayOfWeek: 1,
              startTime: '08:00',
              endTime: '09:00',
              course: {
                subject: { name: 'Matemáticas' },
                classroom: {
                  section: {
                    gradeLevel: { name: '1ro Primaria' },
                    name: 'A',
                  },
                },
              },
            },
          ]);
        }
        return Promise.resolve([]);
      });

      const createDto = {
        courseId: 'course-1',
        dayOfWeek: 1,
        startTime: '08:30', // Overlaps with existing
        endTime: '09:30',
      };

      await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
      await expect(service.create(createDto)).rejects.toThrow(/Conflicto de horario/);
    });

    it('should detect classroom conflict', async () => {
      mockPrismaService.schedule.findMany.mockImplementation(({ where }) => {
        if (where.course?.classroomId) {
          return Promise.resolve([
            {
              id: 'existing-1',
              dayOfWeek: 1,
              startTime: '08:00',
              endTime: '09:00',
              course: {
                subject: { name: 'Ciencias' },
                teacher: { firstName: 'María', lastName: 'López' },
              },
            },
          ]);
        }
        return Promise.resolve([]);
      });

      const createDto = {
        courseId: 'course-1',
        dayOfWeek: 1,
        startTime: '08:30',
        endTime: '09:30',
      };

      await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
    });

    it('should allow non-overlapping schedules', async () => {
      mockPrismaService.schedule.findMany.mockResolvedValue([]);
      mockPrismaService.schedule.create.mockResolvedValue({
        id: 'new-schedule',
        courseId: 'course-1',
        dayOfWeek: 1,
        startTime: '10:00',
        endTime: '11:00',
      });

      const createDto = {
        courseId: 'course-1',
        dayOfWeek: 1,
        startTime: '10:00',
        endTime: '11:00',
      };

      const result = await service.create(createDto);
      expect(result).toBeDefined();
    });

    it('should allow schedules on different days', async () => {
      // Existing schedule on Monday
      mockPrismaService.schedule.findMany.mockResolvedValue([]);
      mockPrismaService.schedule.create.mockResolvedValue({
        id: 'new-schedule',
        courseId: 'course-1',
        dayOfWeek: 2, // Tuesday
        startTime: '08:00',
        endTime: '09:00',
      });

      const createDto = {
        courseId: 'course-1',
        dayOfWeek: 2, // Different day
        startTime: '08:00',
        endTime: '09:00',
      };

      const result = await service.create(createDto);
      expect(result).toBeDefined();
    });
  });

  describe('checkAvailability', () => {
    it('should return available:true when no conflicts', async () => {
      mockPrismaService.course.findUnique.mockResolvedValue({
        id: 'course-1',
        teacher: { id: 'teacher-1' },
        classroom: { id: 'classroom-1' },
      });
      mockPrismaService.schedule.findMany.mockResolvedValue([]);

      const result = await service.checkAvailability(
        'course-1',
        1,
        '10:00',
        '11:00',
      );

      expect(result.available).toBe(true);
      expect(result.conflicts).toHaveLength(0);
    });

    it('should return available:false with conflict details', async () => {
      mockPrismaService.course.findUnique.mockResolvedValue({
        id: 'course-1',
        teacher: { id: 'teacher-1' },
        classroom: { id: 'classroom-1' },
      });
      mockPrismaService.schedule.findMany.mockResolvedValue([
        {
          id: 'conflict-1',
          dayOfWeek: 1,
          startTime: '09:30',
          endTime: '10:30',
          course: {
            subject: { name: 'Historia' },
            teacher: { firstName: 'Pedro', lastName: 'García' },
            classroom: {
              section: {
                gradeLevel: { name: '2do' },
                name: 'B',
              },
            },
          },
        },
      ]);

      const result = await service.checkAvailability(
        'course-1',
        1,
        '10:00',
        '11:00',
      );

      expect(result.available).toBe(false);
      expect(result.conflicts.length).toBeGreaterThan(0);
    });

    it('should throw NotFoundException for invalid course', async () => {
      mockPrismaService.course.findUnique.mockResolvedValue(null);

      await expect(
        service.checkAvailability('invalid-id', 1, '10:00', '11:00'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getTeacherSchedule', () => {
    it('should throw NotFoundException for invalid teacher', async () => {
      mockPrismaService.teacher.findFirst.mockResolvedValue(null);

      await expect(service.getTeacherSchedule('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return grouped schedule by day', async () => {
      mockPrismaService.teacher.findFirst.mockResolvedValue({
        id: 'teacher-1',
        firstName: 'Test',
      });
      mockPrismaService.schedule.findMany.mockResolvedValue([
        {
          id: 's1',
          dayOfWeek: 1,
          startTime: '08:00',
          endTime: '09:00',
          course: {
            subject: { name: 'Math' },
            classroom: {
              section: {
                gradeLevel: { name: '1st', level: { name: 'Primary' } },
              },
            },
          },
        },
        {
          id: 's2',
          dayOfWeek: 1,
          startTime: '10:00',
          endTime: '11:00',
          course: {
            subject: { name: 'Science' },
            classroom: {
              section: {
                gradeLevel: { name: '2nd', level: { name: 'Primary' } },
              },
            },
          },
        },
      ]);

      const result = await service.getTeacherSchedule('teacher-1');

      expect(result).toHaveProperty('1'); // Monday
      expect(result[1]).toHaveLength(2);
      // Should be sorted by start time
      expect(result[1][0].startTime).toBe('08:00');
      expect(result[1][1].startTime).toBe('10:00');
    });
  });
});
