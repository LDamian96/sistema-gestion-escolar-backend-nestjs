# Sistema de Gestión Escolar - Backend

Backend API REST desarrollado con NestJS para un sistema completo de gestión escolar.

## 🚀 Características

- **Autenticación JWT** con refresh tokens
- **Multi-tenant** (múltiples escuelas)
- **Control de acceso basado en roles** (ADMIN, TEACHER, STUDENT, PARENT)
- **API RESTful** completa
- **Base de datos** MySQL con Prisma ORM
- **Rate limiting** y protección DDoS
- **Validación de datos** con class-validator
- **Manejo global de errores**

## 📦 Módulos

- **Auth**: Autenticación y autorización
- **Students**: Gestión de estudiantes
- **Teachers**: Gestión de profesores
- **Parents**: Gestión de padres de familia
- **Subjects**: Gestión de materias
- **Courses**: Gestión de cursos
- **Curriculum**: Unidades y temas curriculares
- **Grades**: Calificaciones
- **Tasks**: Tareas y asignaciones
- **Attendance**: Control de asistencia
- **Enrollments**: Matrículas
- **Workshops**: Talleres extracurriculares
- **Schedules**: Horarios de clases
- **Analytics**: Dashboard y estadísticas
- **Payments**: Gestión de pagos (próximamente)

## 🛠️ Tecnologías

- **NestJS** 10.x
- **TypeScript** 5.x
- **Prisma ORM** 6.x
- **MySQL** 8.x
- **JWT** para autenticación
- **Bcrypt** para hash de contraseñas
- **Class Validator** para validación de DTOs

## 📋 Requisitos

- Node.js >= 18.x
- MySQL >= 8.0
- npm o yarn

## ⚙️ Instalación

1. Clonar el repositorio:
```bash
git clone https://github.com/[tu-usuario]/sistema-gestion-escolar-backend-nestjs.git
cd sistema-gestion-escolar-backend-nestjs
```

2. Instalar dependencias:
```bash
npm install
```

3. Configurar variables de entorno (.env):
```env
PORT=4000
NODE_ENV=development
DATABASE_URL="mysql://root:password@localhost:3306/school_management"
JWT_SECRET="tu-secreto-super-seguro"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_SECRET="tu-secreto-refresh-super-seguro"
JWT_REFRESH_EXPIRES_IN="7d"
```

4. Ejecutar migraciones de Prisma:
```bash
npx prisma migrate dev
```

5. (Opcional) Ejecutar seed para datos de prueba:
```bash
npx prisma db seed
```

## 🚀 Ejecución

### Desarrollo
```bash
npm run start:dev
```

### Producción
```bash
npm run build
npm run start
```

El servidor estará disponible en `http://localhost:4000`

## 📚 Documentación API

### Autenticación

**Login**
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@school.com",
  "password": "Admin123!"
}
```

**Registro**
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "nuevo@school.com",
  "password": "Password123!",
  "role": "TEACHER",
  "schoolId": "uuid-de-escuela"
}
```

### Endpoints Principales

Todos los endpoints (excepto login/register) requieren autenticación JWT:

```http
Authorization: Bearer {token}
```

- `GET /api/students` - Listar estudiantes
- `GET /api/teachers` - Listar profesores
- `GET /api/courses` - Listar cursos
- `GET /api/subjects` - Listar materias
- `GET /api/curriculum/units` - Listar unidades curriculares
- `GET /api/curriculum/topics` - Listar temas curriculares
- `GET /api/grades` - Listar calificaciones
- `GET /api/attendance` - Listar asistencias
- `GET /api/analytics/dashboard` - Dashboard con estadísticas

## 🏗️ Estructura del Proyecto

```
backend/
├── src/
│   ├── auth/              # Módulo de autenticación
│   ├── common/            # Decoradores, filtros, guards
│   ├── config/            # Configuración de la app
│   ├── database/          # Módulo de base de datos
│   └── modules/           # Módulos de negocio
│       ├── students/
│       ├── teachers/
│       ├── curriculum/
│       └── ...
├── prisma/
│   ├── schema.prisma     # Esquema de base de datos
│   ├── seed.ts           # Datos de prueba
│   └── migrations/       # Migraciones
└── dist/                 # Código compilado
```

## 🔐 Seguridad

- JWT con access y refresh tokens
- Passwords hasheados con bcrypt
- Rate limiting (100 req/min)
- Validación de datos en todos los endpoints
- Filtros de excepción personalizados
- Multi-tenant por schoolId

## 👥 Roles y Permisos

- **ADMIN**: Acceso completo al sistema
- **TEACHER**: Gestión de cursos, calificaciones, tareas
- **STUDENT**: Lectura de sus datos y calificaciones
- **PARENT**: Lectura de datos de sus hijos

## 📝 Scripts

```bash
npm run build          # Compilar TypeScript
npm run start          # Iniciar en producción
npm run start:dev      # Iniciar en desarrollo
npm run prisma:migrate # Ejecutar migraciones
npm run prisma:studio  # Abrir Prisma Studio
```

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto es privado y de uso educativo.

## ✨ Estado del Proyecto

✅ Backend completamente funcional  
✅ 15+ endpoints operativos  
✅ Autenticación y autorización implementadas  
✅ Módulo de curriculum completo  
✅ Multi-tenant funcionando  
⏳ Frontend en desarrollo  

---

Desarrollado con ❤️ usando NestJS
