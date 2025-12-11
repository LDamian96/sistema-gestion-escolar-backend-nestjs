import { Injectable, NotFoundException, StreamableFile } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import PDFDocument from 'pdfkit';
import { Response } from 'express';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  // Generar boleta de notas en PDF
  async generateReportCard(
    studentId: string,
    periodId: string,
    schoolId: string,
    res: Response,
  ) {
    // Obtener datos del estudiante
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, schoolId },
      include: {
        user: { select: { email: true } },
        enrollments: {
          include: {
            classroom: {
              include: {
                section: {
                  include: {
                    gradeLevel: {
                      include: { level: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!student) {
      throw new NotFoundException('Estudiante no encontrado');
    }

    // Obtener periodo
    const period = await this.prisma.period.findUnique({
      where: { id: periodId },
      include: { academicYear: true },
    });

    if (!period) {
      throw new NotFoundException('Periodo no encontrado');
    }

    // Obtener notas del estudiante en el periodo
    const grades = await this.prisma.grade.findMany({
      where: { studentId, periodId },
      include: {
        course: {
          include: {
            subject: true,
            teacher: true,
          },
        },
      },
      orderBy: { course: { subject: { name: 'asc' } } },
    });

    // Obtener información de la escuela
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
    });

    // Crear documento PDF
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      info: {
        Title: `Boleta de Notas - ${student.firstName} ${student.lastName}`,
        Author: school?.name || 'Sistema de Gestión Escolar',
      },
    });

    // Configurar headers para descarga
    const filename = `boleta_${student.enrollmentCode}_${period.name.replace(/\s/g, '_')}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Pipe al response
    doc.pipe(res);

    // === GENERAR CONTENIDO DEL PDF ===

    // Encabezado de la escuela
    doc.fontSize(18).font('Helvetica-Bold').text(school?.name || 'Institución Educativa', { align: 'center' });
    doc.fontSize(10).font('Helvetica').text(school?.address || '', { align: 'center' });
    doc.moveDown(0.5);

    // Línea separadora
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.5);

    // Título del documento
    doc.fontSize(14).font('Helvetica-Bold').text('BOLETA DE NOTAS', { align: 'center' });
    doc.fontSize(11).font('Helvetica').text(`${period.name} - ${period.academicYear.name}`, { align: 'center' });
    doc.moveDown();

    // Información del estudiante
    doc.fontSize(10).font('Helvetica-Bold').text('DATOS DEL ESTUDIANTE');
    doc.moveDown(0.3);

    const enrollment = student.enrollments[0];
    const gradeInfo = enrollment?.classroom?.section?.gradeLevel;
    const sectionInfo = enrollment?.classroom?.section;

    doc.font('Helvetica');
    const infoY = doc.y;
    doc.text(`Nombre: ${student.firstName} ${student.lastName}`, 50, infoY);
    doc.text(`Grado: ${gradeInfo?.name || '-'} ${sectionInfo?.name || ''}`, 300, infoY);
    doc.text(`Código: ${student.enrollmentCode}`, 50, infoY + 15);
    doc.text(`Nivel: ${gradeInfo?.level?.name || '-'}`, 300, infoY + 15);
    doc.moveDown(2);

    // Tabla de notas
    doc.fontSize(10).font('Helvetica-Bold').text('CALIFICACIONES');
    doc.moveDown(0.5);

    // Encabezados de tabla
    const tableTop = doc.y;
    const tableLeft = 50;
    const colWidths = [200, 100, 80, 115];

    // Header de la tabla
    doc.rect(tableLeft, tableTop, 495, 20).fill('#f0f0f0');
    doc.fillColor('black');
    doc.text('ASIGNATURA', tableLeft + 5, tableTop + 5, { width: colWidths[0] });
    doc.text('DOCENTE', tableLeft + colWidths[0] + 5, tableTop + 5, { width: colWidths[1] });
    doc.text('NOTA', tableLeft + colWidths[0] + colWidths[1] + 5, tableTop + 5, { width: colWidths[2], align: 'center' });
    doc.text('CALIFICACIÓN', tableLeft + colWidths[0] + colWidths[1] + colWidths[2] + 5, tableTop + 5, { width: colWidths[3], align: 'center' });

    // Filas de datos
    let rowY = tableTop + 20;
    let totalScore = 0;

    doc.font('Helvetica');
    grades.forEach((grade, index) => {
      const bgColor = index % 2 === 0 ? '#ffffff' : '#f9f9f9';
      doc.rect(tableLeft, rowY, 495, 20).fill(bgColor);
      doc.fillColor('black');

      doc.text(grade.course.subject.name, tableLeft + 5, rowY + 5, { width: colWidths[0] });
      doc.text(`${grade.course.teacher.firstName} ${grade.course.teacher.lastName}`.substring(0, 15), tableLeft + colWidths[0] + 5, rowY + 5, { width: colWidths[1] });
      doc.text(grade.score.toString(), tableLeft + colWidths[0] + colWidths[1] + 5, rowY + 5, { width: colWidths[2], align: 'center' });
      doc.text(grade.letterGrade || this.calculateLetterGrade(grade.score), tableLeft + colWidths[0] + colWidths[1] + colWidths[2] + 5, rowY + 5, { width: colWidths[3], align: 'center' });

      totalScore += grade.score;
      rowY += 20;
    });

    // Promedio general
    if (grades.length > 0) {
      const average = totalScore / grades.length;
      doc.rect(tableLeft, rowY, 495, 25).fill('#e0e0e0');
      doc.fillColor('black');
      doc.font('Helvetica-Bold');
      doc.text('PROMEDIO GENERAL', tableLeft + 5, rowY + 7, { width: colWidths[0] + colWidths[1] });
      doc.text(average.toFixed(2), tableLeft + colWidths[0] + colWidths[1] + 5, rowY + 7, { width: colWidths[2], align: 'center' });
      doc.text(this.calculateLetterGrade(average), tableLeft + colWidths[0] + colWidths[1] + colWidths[2] + 5, rowY + 7, { width: colWidths[3], align: 'center' });
      rowY += 25;
    }

    // Borde de la tabla
    doc.rect(tableLeft, tableTop, 495, rowY - tableTop).stroke();

    // Leyenda de calificaciones
    doc.moveDown(2);
    doc.fontSize(9).font('Helvetica-Bold').text('ESCALA DE CALIFICACIÓN:');
    doc.font('Helvetica');
    doc.text('AD (18-20): Logro destacado | A (14-17): Logro esperado | B (11-13): En proceso | C (0-10): En inicio');

    // Pie de página
    const bottomY = 750;
    doc.fontSize(8).text(`Documento generado el ${new Date().toLocaleDateString('es-PE')}`, 50, bottomY, { align: 'center', width: 495 });
    doc.text('Este documento es válido sin firma ni sello', 50, bottomY + 12, { align: 'center', width: 495 });

    // Finalizar documento
    doc.end();
  }

  // Generar reporte de asistencia
  async generateAttendanceReport(
    courseId: string,
    startDate: Date,
    endDate: Date,
    schoolId: string,
    res: Response,
  ) {
    // Obtener datos del curso
    const course = await this.prisma.course.findFirst({
      where: { id: courseId },
      include: {
        subject: true,
        teacher: true,
        classroom: {
          include: {
            section: {
              include: {
                gradeLevel: { include: { level: true } },
              },
            },
          },
        },
      },
    });

    if (!course) {
      throw new NotFoundException('Curso no encontrado');
    }

    // Obtener asistencias
    const attendances = await this.prisma.attendance.findMany({
      where: {
        courseId,
        date: { gte: startDate, lte: endDate },
      },
      include: {
        student: true,
      },
      orderBy: [{ date: 'asc' }, { student: { lastName: 'asc' } }],
    });

    const school = await this.prisma.school.findUnique({ where: { id: schoolId } });

    // Crear PDF
    const doc = new PDFDocument({ size: 'A4', margin: 50, layout: 'landscape' });

    const filename = `asistencia_${course.subject.name.replace(/\s/g, '_')}_${startDate.toISOString().split('T')[0]}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    doc.pipe(res);

    // Encabezado
    doc.fontSize(16).font('Helvetica-Bold').text(school?.name || 'Institución Educativa', { align: 'center' });
    doc.fontSize(12).text('REPORTE DE ASISTENCIA', { align: 'center' });
    doc.moveDown();

    doc.fontSize(10).font('Helvetica');
    doc.text(`Curso: ${course.subject.name}`);
    doc.text(`Profesor: ${course.teacher.firstName} ${course.teacher.lastName}`);
    doc.text(`Grado: ${course.classroom.section.gradeLevel.name} "${course.classroom.section.name}"`);
    doc.text(`Período: ${startDate.toLocaleDateString('es-PE')} - ${endDate.toLocaleDateString('es-PE')}`);
    doc.moveDown();

    // Agrupar por estudiante
    const studentStats: Record<string, { name: string; present: number; absent: number; late: number; excused: number; total: number }> = {};

    attendances.forEach((att) => {
      const key = att.studentId;
      if (!studentStats[key]) {
        studentStats[key] = {
          name: `${att.student.lastName}, ${att.student.firstName}`,
          present: 0,
          absent: 0,
          late: 0,
          excused: 0,
          total: 0,
        };
      }
      studentStats[key][att.status.toLowerCase() as 'present' | 'absent' | 'late' | 'excused']++;
      studentStats[key].total++;
    });

    // Tabla
    const tableTop = doc.y;
    const headers = ['ESTUDIANTE', 'PRESENTE', 'AUSENTE', 'TARDE', 'JUSTIFICADO', '% ASIST.'];
    const colWidths = [200, 80, 80, 80, 90, 80];

    // Header
    doc.rect(50, tableTop, 710, 20).fill('#f0f0f0');
    doc.fillColor('black').font('Helvetica-Bold');
    let xPos = 55;
    headers.forEach((header, i) => {
      doc.text(header, xPos, tableTop + 5, { width: colWidths[i], align: i === 0 ? 'left' : 'center' });
      xPos += colWidths[i];
    });

    // Datos
    let rowY = tableTop + 20;
    doc.font('Helvetica');
    Object.values(studentStats).forEach((stat, index) => {
      const bgColor = index % 2 === 0 ? '#ffffff' : '#f9f9f9';
      doc.rect(50, rowY, 710, 18).fill(bgColor);
      doc.fillColor('black');

      const attendance = stat.total > 0 ? ((stat.present + stat.late + stat.excused) / stat.total * 100).toFixed(1) : '0';

      let x = 55;
      doc.text(stat.name, x, rowY + 4, { width: colWidths[0] }); x += colWidths[0];
      doc.text(stat.present.toString(), x, rowY + 4, { width: colWidths[1], align: 'center' }); x += colWidths[1];
      doc.text(stat.absent.toString(), x, rowY + 4, { width: colWidths[2], align: 'center' }); x += colWidths[2];
      doc.text(stat.late.toString(), x, rowY + 4, { width: colWidths[3], align: 'center' }); x += colWidths[3];
      doc.text(stat.excused.toString(), x, rowY + 4, { width: colWidths[4], align: 'center' }); x += colWidths[4];
      doc.text(`${attendance}%`, x, rowY + 4, { width: colWidths[5], align: 'center' });

      rowY += 18;
    });

    doc.rect(50, tableTop, 710, rowY - tableTop).stroke();

    // Pie
    doc.fontSize(8).text(`Generado: ${new Date().toLocaleString('es-PE')}`, 50, 520, { align: 'right', width: 710 });

    doc.end();
  }

  private calculateLetterGrade(score: number): string {
    if (score >= 18) return 'AD';
    if (score >= 14) return 'A';
    if (score >= 11) return 'B';
    return 'C';
  }
}
