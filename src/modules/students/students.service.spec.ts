import { Test, TestingModule } from '@nestjs/testing';
import { StudentsService } from './students.service';
import { PrismaService } from '../../database/prisma.service';
import { NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { Role, Gender } from '../../../generated/prisma';

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
}));

describe('StudentsService', () => {
  let service: StudentsService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    student: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    parent: {
      findFirst: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudentsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<StudentsService>(StudentsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto = {
      email: 'student@school.com',
      password: 'Password123!',
      enrollmentCode: 'STU-001',
      firstName: 'Juan',
      lastName: 'García',
      dateOfBirth: '2010-05-15',
      gender: Gender.MALE,
    };
    const schoolId = 'school-1';

    it('should throw ConflictException if email already exists', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'existing-user' });

      await expect(service.create(createDto, schoolId)).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if enrollment code exists in school', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.student.findFirst.mockResolvedValue({ id: 'existing-student' });

      await expect(service.create(createDto, schoolId)).rejects.toThrow(ConflictException);
    });

    it('should create student successfully', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.student.findFirst.mockResolvedValue(null);

      const createdStudent = {
        id: 'student-1',
        ...createDto,
        user: {
          id: 'user-1',
          email: createDto.email,
          role: Role.STUDENT,
          isActive: true,
        },
      };

      mockPrismaService.$transaction.mockResolvedValue(createdStudent);

      const result = await service.create(createDto, schoolId);

      expect(result).toBeDefined();
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    const schoolId = 'school-1';

    it('should return paginated results', async () => {
      const mockStudents = [
        { id: '1', firstName: 'Ana', lastName: 'López', enrollments: [] },
        { id: '2', firstName: 'Carlos', lastName: 'Pérez', enrollments: [] },
      ];

      mockPrismaService.student.findMany.mockResolvedValue(mockStudents);
      mockPrismaService.student.count.mockResolvedValue(2);

      const result = await service.findAll(schoolId, { page: 1, limit: 10 });

      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
      expect(result.meta.page).toBe(1);
      expect(result.meta.totalPages).toBe(1);
    });

    it('should filter by search term', async () => {
      mockPrismaService.student.findMany.mockResolvedValue([]);
      mockPrismaService.student.count.mockResolvedValue(0);

      await service.findAll(schoolId, { search: 'García' });

      expect(mockPrismaService.student.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { firstName: { contains: 'García' } },
              { lastName: { contains: 'García' } },
              { enrollmentCode: { contains: 'García' } },
            ]),
          }),
        }),
      );
    });

    it('should calculate pagination correctly', async () => {
      mockPrismaService.student.findMany.mockResolvedValue([]);
      mockPrismaService.student.count.mockResolvedValue(50);

      const result = await service.findAll(schoolId, { page: 2, limit: 20 });

      expect(result.meta.totalPages).toBe(3);
      expect(result.meta.hasNextPage).toBe(true);
      expect(result.meta.hasPrevPage).toBe(true);
    });
  });

  describe('findOne', () => {
    const schoolId = 'school-1';
    const studentId = 'student-1';

    it('should throw NotFoundException if student not found', async () => {
      mockPrismaService.student.findFirst.mockResolvedValue(null);

      await expect(service.findOne(studentId, schoolId)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if student tries to view another student', async () => {
      const student = {
        id: studentId,
        userId: 'user-1',
        enrollments: [],
        grades: [],
        parents: [],
      };

      mockPrismaService.student.findFirst.mockResolvedValue(student);

      await expect(
        service.findOne(studentId, schoolId, 'different-user-id', Role.STUDENT),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow student to view their own data', async () => {
      const student = {
        id: studentId,
        userId: 'user-1',
        enrollments: [],
        grades: [],
        parents: [],
      };

      mockPrismaService.student.findFirst.mockResolvedValue(student);

      const result = await service.findOne(studentId, schoolId, 'user-1', Role.STUDENT);

      expect(result).toBeDefined();
      expect(result.id).toBe(studentId);
    });

    it('should throw ForbiddenException if parent is not linked to student', async () => {
      const student = {
        id: studentId,
        userId: 'student-user',
        enrollments: [],
        grades: [],
        parents: [],
      };

      mockPrismaService.student.findFirst.mockResolvedValue(student);
      mockPrismaService.parent.findFirst.mockResolvedValue({
        id: 'parent-1',
        students: [], // No linked students
      });

      await expect(
        service.findOne(studentId, schoolId, 'parent-user-id', Role.PARENT),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow admin to view any student', async () => {
      const student = {
        id: studentId,
        userId: 'user-1',
        enrollments: [],
        grades: [],
        parents: [],
      };

      mockPrismaService.student.findFirst.mockResolvedValue(student);

      const result = await service.findOne(studentId, schoolId, 'admin-user', Role.ADMIN);

      expect(result).toBeDefined();
    });
  });

  describe('update', () => {
    const schoolId = 'school-1';
    const studentId = 'student-1';

    it('should throw NotFoundException if student not found', async () => {
      mockPrismaService.student.findFirst.mockResolvedValue(null);

      await expect(
        service.update(studentId, { firstName: 'New Name' }, schoolId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update student successfully', async () => {
      mockPrismaService.student.findFirst.mockResolvedValue({
        id: studentId,
        firstName: 'Old Name',
      });
      mockPrismaService.student.update.mockResolvedValue({
        id: studentId,
        firstName: 'New Name',
      });

      const result = await service.update(
        studentId,
        { firstName: 'New Name' },
        schoolId,
      );

      expect(result.firstName).toBe('New Name');
    });
  });

  describe('remove', () => {
    const schoolId = 'school-1';
    const studentId = 'student-1';

    it('should soft delete student', async () => {
      mockPrismaService.student.findFirst.mockResolvedValue({
        id: studentId,
        userId: 'user-1',
      });
      mockPrismaService.user.update.mockResolvedValue({
        id: 'user-1',
        isActive: false,
        deletedAt: new Date(),
      });

      const result = await service.remove(studentId, schoolId);

      expect(result.message).toBe('Estudiante eliminado exitosamente');
      expect(mockPrismaService.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isActive: false,
            deletedAt: expect.any(Date),
          }),
        }),
      );
    });
  });

  describe('getGenderStats', () => {
    it('should return gender statistics', async () => {
      mockPrismaService.student.findMany.mockResolvedValue([
        { gender: 'M' },
        { gender: 'M' },
        { gender: 'F' },
        { gender: 'F' },
        { gender: 'F' },
      ]);

      const result = await service.getGenderStats('school-1');

      expect(result.total).toBe(5);
      expect(result.byGender.M).toBe(2);
      expect(result.byGender.F).toBe(3);
    });
  });
});
