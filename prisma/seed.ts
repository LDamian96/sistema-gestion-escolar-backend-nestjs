import { PrismaClient, Role, Gender, AttendanceStatus, TaskType, SubmissionType, PaymentStatus, GradeScale } from '../generated/prisma';
import * as bcrypt from 'bcrypt';

// Crear cliente Prisma sin adapter para MySQL local
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de datos...\n');

  // Limpiar datos existentes (solo en desarrollo)
  console.log('🗑️  Limpiando datos existentes...');
  await prisma.workshopEnrollment.deleteMany();
  await prisma.workshop.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.reportCard.deleteMany();
  await prisma.grade.deleteMany();
  await prisma.taskSubmission.deleteMany();
  await prisma.task.deleteMany();
  await prisma.curriculumTopic.deleteMany();
  await prisma.curriculumUnit.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.schedule.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.course.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.classroom.deleteMany();
  await prisma.section.deleteMany();
  await prisma.gradeLevel.deleteMany();
  await prisma.period.deleteMany();
  await prisma.academicYear.deleteMany();
  await prisma.level.deleteMany();
  await prisma.studentParent.deleteMany();
  await prisma.student.deleteMany();
  await prisma.teacher.deleteMany();
  await prisma.parent.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
  await prisma.school.deleteMany();

  // ========================================
  // 1. CREAR ESCUELA
  // ========================================
  console.log('🏫 Creando escuela...');
  const school = await prisma.school.create({
    data: {
      name: 'Colegio San Martín',
      address: 'Av. Principal 123, Lima, Perú',
      phone: '+51 999 888 777',
      email: 'info@colegiosanmartin.edu.pe',
    },
  });

  console.log(`✅ Escuela creada: ${school.name}\n`);

  // ========================================
  // 2. CREAR USUARIOS BASE
  // ========================================
  console.log('👥 Creando usuarios...');
  const password = await bcrypt.hash('Admin123!', 10);

  // Admin
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@school.com',
      password,
      role: Role.ADMIN,
      schoolId: school.id,
    },
  });

  // Profesores
  const teacher1User = await prisma.user.create({
    data: {
      email: 'profesor1@school.com',
      password,
      role: Role.TEACHER,
      schoolId: school.id,
    },
  });

  const teacher2User = await prisma.user.create({
    data: {
      email: 'profesor2@school.com',
      password,
      role: Role.TEACHER,
      schoolId: school.id,
    },
  });

  // Estudiantes
  const student1User = await prisma.user.create({
    data: {
      email: 'estudiante1@school.com',
      password,
      role: Role.STUDENT,
      schoolId: school.id,
    },
  });

  const student2User = await prisma.user.create({
    data: {
      email: 'estudiante2@school.com',
      password,
      role: Role.STUDENT,
      schoolId: school.id,
    },
  });

  const student3User = await prisma.user.create({
    data: {
      email: 'estudiante3@school.com',
      password,
      role: Role.STUDENT,
      schoolId: school.id,
    },
  });

  // Padres
  const parent1User = await prisma.user.create({
    data: {
      email: 'padre1@school.com',
      password,
      role: Role.PARENT,
      schoolId: school.id,
    },
  });

  const parent2User = await prisma.user.create({
    data: {
      email: 'madre1@school.com',
      password,
      role: Role.PARENT,
      schoolId: school.id,
    },
  });

  console.log(`✅ ${await prisma.user.count()} usuarios creados\n`);

  // ========================================
  // 3. CREAR PERFILES
  // ========================================
  console.log('📋 Creando perfiles...');

  // Profesores
  const teacher1 = await prisma.teacher.create({
    data: {
      userId: teacher1User.id,
      schoolId: school.id,
      firstName: 'Carlos',
      lastName: 'González',
      dateOfBirth: new Date('1985-03-15'),
      gender: Gender.MALE,
      phone: '+51 999 111 222',
      specialty: 'Matemáticas',
    },
  });

  const teacher2 = await prisma.teacher.create({
    data: {
      userId: teacher2User.id,
      schoolId: school.id,
      firstName: 'María',
      lastName: 'Rodríguez',
      dateOfBirth: new Date('1988-07-20'),
      gender: Gender.FEMALE,
      phone: '+51 999 333 444',
      specialty: 'Comunicación',
    },
  });

  // Estudiantes
  const student1 = await prisma.student.create({
    data: {
      userId: student1User.id,
      schoolId: school.id,
      firstName: 'Juan',
      lastName: 'Pérez',
      dateOfBirth: new Date('2010-05-10'),
      gender: Gender.MALE,
      address: 'Calle Los Alamos 456',
      phone: '+51 999 555 666',
      enrollmentCode: 'EST-2024-001',
    },
  });

  const student2 = await prisma.student.create({
    data: {
      userId: student2User.id,
      schoolId: school.id,
      firstName: 'Ana',
      lastName: 'García',
      dateOfBirth: new Date('2010-08-22'),
      gender: Gender.FEMALE,
      address: 'Av. Los Pinos 789',
      phone: '+51 999 777 888',
      enrollmentCode: 'EST-2024-002',
    },
  });

  const student3 = await prisma.student.create({
    data: {
      userId: student3User.id,
      schoolId: school.id,
      firstName: 'Luis',
      lastName: 'Torres',
      dateOfBirth: new Date('2010-11-05'),
      gender: Gender.MALE,
      address: 'Jr. Las Flores 321',
      phone: '+51 999 999 000',
      enrollmentCode: 'EST-2024-003',
    },
  });

  // Padres
  const parent1 = await prisma.parent.create({
    data: {
      userId: parent1User.id,
      schoolId: school.id,
      firstName: 'Roberto',
      lastName: 'Pérez',
      phone: '+51 999 111 000',
      occupation: 'Ingeniero',
    },
  });

  const parent2 = await prisma.parent.create({
    data: {
      userId: parent2User.id,
      schoolId: school.id,
      firstName: 'Carmen',
      lastName: 'Pérez',
      phone: '+51 999 222 000',
      occupation: 'Doctora',
    },
  });

  // Relación padre-estudiante
  await prisma.studentParent.create({
    data: {
      studentId: student1.id,
      parentId: parent1.id,
      relationship: 'Padre',
      isPrimary: true,
    },
  });

  await prisma.studentParent.create({
    data: {
      studentId: student1.id,
      parentId: parent2.id,
      relationship: 'Madre',
      isPrimary: false,
    },
  });

  console.log(`✅ Perfiles creados\n`);

  // ========================================
  // 4. ESTRUCTURA ACADÉMICA
  // ========================================
  console.log('📚 Creando estructura académica...');

  // Año académico
  const academicYear = await prisma.academicYear.create({
    data: {
      schoolId: school.id,
      name: '2024',
      startDate: new Date('2024-03-01'),
      endDate: new Date('2024-12-20'),
      isCurrent: true,
    },
  });

  // Periodos
  const period1 = await prisma.period.create({
    data: {
      academicYearId: academicYear.id,
      name: '1er Bimestre',
      startDate: new Date('2024-03-01'),
      endDate: new Date('2024-05-15'),
    },
  });

  const period2 = await prisma.period.create({
    data: {
      academicYearId: academicYear.id,
      name: '2do Bimestre',
      startDate: new Date('2024-05-16'),
      endDate: new Date('2024-07-31'),
    },
  });

  // Niveles
  const primaryLevel = await prisma.level.create({
    data: {
      schoolId: school.id,
      name: 'Primaria',
      order: 1,
    },
  });

  // Grados
  const grade6 = await prisma.gradeLevel.create({
    data: {
      levelId: primaryLevel.id,
      name: '6to Grado',
      order: 6,
    },
  });

  // Secciones
  const sectionA = await prisma.section.create({
    data: {
      gradeLevelId: grade6.id,
      name: 'A',
      capacity: 30,
    },
  });

  // Aulas
  const classroom = await prisma.classroom.create({
    data: {
      sectionId: sectionA.id,
      name: 'Aula 6A',
      capacity: 30,
      location: 'Piso 2',
    },
  });

  // Materias
  const mathSubject = await prisma.subject.create({
    data: {
      gradeLevelId: grade6.id,
      name: 'Matemática',
      code: 'MAT-6',
      description: 'Matemática para sexto grado',
    },
  });

  const spanishSubject = await prisma.subject.create({
    data: {
      gradeLevelId: grade6.id,
      name: 'Comunicación',
      code: 'COM-6',
      description: 'Comunicación y lenguaje',
    },
  });

  // Cursos
  const mathCourse = await prisma.course.create({
    data: {
      academicYearId: academicYear.id,
      subjectId: mathSubject.id,
      teacherId: teacher1.id,
      classroomId: classroom.id,
    },
  });

  const spanishCourse = await prisma.course.create({
    data: {
      academicYearId: academicYear.id,
      subjectId: spanishSubject.id,
      teacherId: teacher2.id,
      classroomId: classroom.id,
    },
  });

  console.log(`✅ Estructura académica creada\n`);

  // ========================================
  // 5. MATRÍCULAS
  // ========================================
  console.log('📝 Creando matrículas...');

  await prisma.enrollment.create({
    data: {
      studentId: student1.id,
      classroomId: classroom.id,
      status: 'ACTIVE',
    },
  });

  await prisma.enrollment.create({
    data: {
      studentId: student2.id,
      classroomId: classroom.id,
      status: 'ACTIVE',
    },
  });

  await prisma.enrollment.create({
    data: {
      studentId: student3.id,
      classroomId: classroom.id,
      status: 'ACTIVE',
    },
  });

  console.log(`✅ Matrículas creadas\n`);

  // ========================================
  // 6. HORARIOS
  // ========================================
  console.log('🕐 Creando horarios...');

  // Matemática: Lunes, Miércoles, Viernes 8:00-9:30
  await prisma.schedule.createMany({
    data: [
      { courseId: mathCourse.id, dayOfWeek: 1, startTime: '08:00', endTime: '09:30' },
      { courseId: mathCourse.id, dayOfWeek: 3, startTime: '08:00', endTime: '09:30' },
      { courseId: mathCourse.id, dayOfWeek: 5, startTime: '08:00', endTime: '09:30' },
    ],
  });

  // Comunicación: Martes, Jueves 8:00-9:30
  await prisma.schedule.createMany({
    data: [
      { courseId: spanishCourse.id, dayOfWeek: 2, startTime: '08:00', endTime: '09:30' },
      { courseId: spanishCourse.id, dayOfWeek: 4, startTime: '08:00', endTime: '09:30' },
    ],
  });

  console.log(`✅ Horarios creados\n`);

  // ========================================
  // 7. TAREAS
  // ========================================
  console.log('📄 Creando tareas...');

  const task1 = await prisma.task.create({
    data: {
      courseId: mathCourse.id,
      title: 'Ejercicios de fracciones',
      description: 'Resolver los ejercicios de la página 45',
      type: TaskType.HOMEWORK,
      dueDate: new Date('2024-12-15'),
    },
  });

  const task2 = await prisma.task.create({
    data: {
      courseId: spanishCourse.id,
      title: 'Lectura y resumen',
      description: 'Leer el capítulo 3 y escribir un resumen',
      type: TaskType.HOMEWORK,
      dueDate: new Date('2024-12-16'),
      fileUrl: 'https://example.com/capitulo3.pdf',
    },
  });

  // Entregas de estudiantes
  await prisma.taskSubmission.create({
    data: {
      taskId: task1.id,
      studentId: student1.id,
      submissionType: SubmissionType.PHYSICAL,
      notes: 'Entregado en clase',
      grade: 18.5,
      feedback: 'Excelente trabajo',
      gradedAt: new Date(),
    },
  });

  await prisma.taskSubmission.create({
    data: {
      taskId: task2.id,
      studentId: student2.id,
      submissionType: SubmissionType.DIGITAL,
      fileUrl: 'https://example.com/student2-resumen.pdf',
      notes: 'Entrega digital',
      grade: 17.0,
      feedback: 'Buen análisis',
      gradedAt: new Date(),
    },
  });

  console.log(`✅ Tareas creadas\n`);

  // ========================================
  // 8. NOTAS
  // ========================================
  console.log('📊 Creando notas...');

  await prisma.grade.createMany({
    data: [
      {
        courseId: mathCourse.id,
        studentId: student1.id,
        periodId: period1.id,
        score: 18.5,
        scaleType: GradeScale.NUMERIC,
        observation: 'Excelente rendimiento',
      },
      {
        courseId: mathCourse.id,
        studentId: student2.id,
        periodId: period1.id,
        score: 16.0,
        scaleType: GradeScale.NUMERIC,
        observation: 'Buen trabajo',
      },
      {
        courseId: spanishCourse.id,
        studentId: student1.id,
        periodId: period1.id,
        score: 17.0,
        scaleType: GradeScale.NUMERIC,
        letterGrade: 'A',
        observation: 'Muy buena comprensión lectora',
      },
    ],
  });

  console.log(`✅ Notas creadas\n`);

  // ========================================
  // 9. PAGOS
  // ========================================
  console.log('💰 Creando pagos...');

  await prisma.payment.createMany({
    data: [
      {
        schoolId: school.id,
        studentId: student1.id,
        amount: 350.00,
        description: 'Pensión Diciembre 2024',
        dueDate: new Date('2024-12-05'),
        paidDate: new Date('2024-12-03'),
        status: PaymentStatus.PAID,
        paymentMethod: 'Transferencia',
      },
      {
        schoolId: school.id,
        studentId: student2.id,
        amount: 350.00,
        description: 'Pensión Diciembre 2024',
        dueDate: new Date('2024-12-05'),
        status: PaymentStatus.PENDING,
      },
      {
        schoolId: school.id,
        studentId: student3.id,
        amount: 350.00,
        description: 'Pensión Noviembre 2024',
        dueDate: new Date('2024-11-05'),
        status: PaymentStatus.OVERDUE,
      },
    ],
  });

  console.log(`✅ Pagos creados\n`);

  // ========================================
  // 10. TALLERES
  // ========================================
  console.log('🎨 Creando talleres...');

  const roboticsWorkshop = await prisma.workshop.create({
    data: {
      schoolId: school.id,
      name: 'Taller de Robótica',
      description: 'Introducción a la programación y robótica',
      instructor: 'Ing. Pedro Martínez',
      schedule: 'Lunes y Miércoles 3:00 PM - 4:30 PM',
      capacity: 20,
      startDate: new Date('2024-03-15'),
      endDate: new Date('2024-12-15'),
    },
  });

  await prisma.workshopEnrollment.create({
    data: {
      workshopId: roboticsWorkshop.id,
      studentId: student1.id,
    },
  });

  console.log(`✅ Talleres creados\n`);

  // ========================================
  // RESUMEN FINAL
  // ========================================
  console.log('═══════════════════════════════════════');
  console.log('✅ SEED COMPLETADO CON ÉXITO');
  console.log('═══════════════════════════════════════');
  console.log(`📊 Estadísticas:`);
  console.log(`   - Escuelas: ${await prisma.school.count()}`);
  console.log(`   - Usuarios: ${await prisma.user.count()}`);
  console.log(`   - Estudiantes: ${await prisma.student.count()}`);
  console.log(`   - Profesores: ${await prisma.teacher.count()}`);
  console.log(`   - Padres: ${await prisma.parent.count()}`);
  console.log(`   - Cursos: ${await prisma.course.count()}`);
  console.log(`   - Tareas: ${await prisma.task.count()}`);
  console.log(`   - Notas: ${await prisma.grade.count()}`);
  console.log(`   - Pagos: ${await prisma.payment.count()}`);
  console.log(`   - Talleres: ${await prisma.workshop.count()}`);
  console.log('═══════════════════════════════════════\n');
  console.log('🔐 Credenciales de prueba:');
  console.log('   Admin: admin@school.com / Admin123!');
  console.log('   Profesor: profesor1@school.com / Admin123!');
  console.log('   Estudiante: estudiante1@school.com / Admin123!');
  console.log('   Padre: padre1@school.com / Admin123!');
  console.log('═══════════════════════════════════════\n');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
