import { Injectable, BadRequestException } from '@nestjs/common';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UploadsService {
  private readonly allowedImageTypes = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  private readonly allowedDocumentTypes = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'];
  private readonly maxFileSize = 10 * 1024 * 1024; // 10 MB

  /**
   * Valida que el archivo sea del tipo permitido
   */
  validateFileType(filename: string, allowedTypes: string[]): boolean {
    const ext = extname(filename).toLowerCase();
    return allowedTypes.includes(ext);
  }

  /**
   * Genera un nombre único para el archivo
   */
  generateFileName(originalName: string): string {
    const ext = extname(originalName);
    const uniqueName = `${uuidv4()}${ext}`;
    return uniqueName;
  }

  /**
   * Obtiene la URL completa del archivo
   */
  getFileUrl(filename: string, baseUrl: string): string {
    return `${baseUrl}/uploads/${filename}`;
  }

  /**
   * Valida imagen
   */
  validateImage(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('No se proporcionó ningún archivo');
    }

    const ext = extname(file.originalname).toLowerCase();
    if (!this.allowedImageTypes.includes(ext)) {
      throw new BadRequestException(
        `Tipo de archivo no permitido. Solo se permiten: ${this.allowedImageTypes.join(', ')}`
      );
    }

    if (file.size > this.maxFileSize) {
      throw new BadRequestException(
        `El archivo es demasiado grande. Tamaño máximo: ${this.maxFileSize / 1024 / 1024} MB`
      );
    }
  }

  /**
   * Valida documento
   */
  validateDocument(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('No se proporcionó ningún archivo');
    }

    const ext = extname(file.originalname).toLowerCase();
    if (!this.allowedDocumentTypes.includes(ext)) {
      throw new BadRequestException(
        `Tipo de archivo no permitido. Solo se permiten: ${this.allowedDocumentTypes.join(', ')}`
      );
    }

    if (file.size > this.maxFileSize) {
      throw new BadRequestException(
        `El archivo es demasiado grande. Tamaño máximo: ${this.maxFileSize / 1024 / 1024} MB`
      );
    }
  }

  /**
   * Valida cualquier tipo de archivo
   */
  validateFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('No se proporcionó ningún archivo');
    }

    const ext = extname(file.originalname).toLowerCase();
    const allAllowedTypes = [...this.allowedImageTypes, ...this.allowedDocumentTypes];

    if (!allAllowedTypes.includes(ext)) {
      throw new BadRequestException(
        `Tipo de archivo no permitido. Solo se permiten: ${allAllowedTypes.join(', ')}`
      );
    }

    if (file.size > this.maxFileSize) {
      throw new BadRequestException(
        `El archivo es demasiado grande. Tamaño máximo: ${this.maxFileSize / 1024 / 1024} MB`
      );
    }
  }
}
