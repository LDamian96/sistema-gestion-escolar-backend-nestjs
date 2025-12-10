export class DateUtils {
  static toISODate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toISOString().split('T')[0];
  }

  static isWeekend(date: Date): boolean {
    const day = date.getDay();
    return day === 0 || day === 6; // Domingo o Sábado
  }

  static addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  static getAcademicYear(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    // Si estamos entre enero y febrero, el año académico es el anterior
    return month < 2 ? `${year - 1}` : `${year}`;
  }
}
