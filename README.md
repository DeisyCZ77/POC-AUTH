# NestJS Authentication with JWT & Refresh Tokens

Sistema de autenticación completo con las mejores prácticas usando NestJS, TypeORM, PostgreSQL, JWT y Passport.

## 🚀 Características

- ✅ Autenticación con JWT (Access & Refresh Tokens)
- ✅ Refresh tokens almacenados en cookies HttpOnly
- ✅ Estrategias Passport (Local, JWT, JWT-Refresh)
- ✅ Gestión de sesiones múltiples
- ✅ Revocación de tokens
- ✅ Sistema de roles y permisos
- ✅ Rate limiting
- ✅ Seguridad con Helmet
- ✅ Validación de datos con class-validator
- ✅ TypeORM con PostgreSQL
- ✅ Hash de contraseñas con bcrypt

## 📋 Requisitos Previos

- Node.js >= 18
- PostgreSQL >= 14
- npm o yarn

## 🔧 Instalación

### 1. Clonar e instalar dependencias

```bash
npm install
```

### 2. Configurar base de datos

Iniciar PostgreSQL con Docker:

```bash
docker-compose up -d
```

O configurar PostgreSQL manualmente y crear la base de datos:

```sql
CREATE DATABASE auth_db;
```

### 3. Configurar variables de entorno

Copiar `.env.example` a `.env` y configurar:

```bash
cp .env.example .env
```

**IMPORTANTE**: Cambiar los secrets en producción:

```env
JWT_SECRET=tu-secret-super-seguro-aqui
JWT_REFRESH_SECRET=tu-refresh-secret-super-seguro-aqui
```

### 4. Ejecutar migraciones (opcional)

Si usas migraciones en lugar de `synchronize`:

```bash
npm run migration:generate -- src/migrations/InitialMigration
npm run migration:run
```

### 5. Iniciar la aplicación

```bash
# Desarrollo
npm run start:dev

# Producción
npm run build
npm run start:prod
```

## 📚 Estructura del Proyecto

```
src/
├── auth/
│   ├── decorators/
│   │   ├── current-user.decorator.ts
│   │   ├── public.decorator.ts
│   │   └── roles.decorator.ts
│   ├── dto/
│   │   ├── login.dto.ts
│   │   └── register.dto.ts
│   ├── entities/
│   │   ├── user.entity.ts
│   │   └── refresh-token.entity.ts
│   ├── guards/
│   │   ├── jwt-auth.guard.ts
│   │   ├── jwt-refresh.guard.ts
│   │   ├── local-auth.guard.ts
│   │   └── roles.guard.ts
│   ├── strategies/
│   │   ├── jwt.strategy.ts
│   │   ├── jwt-refresh.strategy.ts
│   │   └── local.strategy.ts
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   └── auth.module.ts
├── config/
│   └── typeorm.config.ts
├── app.module.ts
└── main.ts
```

## 🔐 API Endpoints

### Autenticación

#### POST `/api/auth/register`
Registrar nuevo usuario

```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "firstName": "John",
  "lastName": "Doe"
}
```

#### POST `/api/auth/login`
Iniciar sesión (retorna access token y establece refresh token en cookie)

```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

Respuesta:
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "roles": ["user"]
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

#### POST `/api/auth/refresh`
Renovar access token usando refresh token (cookie)

```bash
# Incluir cookie en la petición
Cookie: refresh_token=eyJhbGciOiJIUzI1NiIs...
```

#### POST `/api/auth/logout`
Cerrar sesión (requiere autenticación)

```bash
Authorization: Bearer <access_token>
```

#### POST `/api/auth/logout-all`
Cerrar todas las sesiones (requiere autenticación)

#### GET `/api/auth/me`
Obtener perfil del usuario actual (requiere autenticación)

### Endpoints Protegidos (Ejemplo)

```typescript
// Público (sin autenticación)
@Public()
@Get('public')
getPublicData() {}

// Requiere autenticación
@Get('profile')
getProfile(@CurrentUser() user: User) {}

// Solo administradores
@Roles('admin')
@Get('admin')
adminOnly() {}

// Admin o moderador
@Roles('admin', 'moderator')
@Delete(':id')
deleteUser() {}
```

## 🛡️ Seguridad

### Cookies HttpOnly

Los refresh tokens se almacenan en cookies HttpOnly para prevenir ataques XSS:

```typescript
res.cookie('refresh_token', token, {
  httpOnly: true,        // No accesible por JavaScript
  secure: true,          // Solo HTTPS en producción
  sameSite: 'strict',    // Protección CSRF
  maxAge: 7 * 24 * 60 * 60 * 1000  // 7 días
});
```

### Hash de Contraseñas

Usamos bcrypt con 12 rounds de salt:

```typescript
const hashedPassword = await bcrypt.hash(password, 12);
```

### Tokens JWT

- **Access Token**: Corta duración (5 minutos)
- **Refresh Token**: Larga duración (1 día)
- Almacenados en diferentes secrets
- Refresh tokens revocables en BD

### Rate Limiting

Protección contra ataques de fuerza bruta:

```typescript
// Login: 5 intentos por minuto
@Throttle({ default: { limit: 5, ttl: 60000 } })
@Post('login')

// Global: 10 requests por minuto
ThrottlerModule.forRoot({
  throttlers: [{ ttl: 60000, limit: 10 }]
})
```

## 🔄 Flujo de Autenticación

1. **Registro/Login**: Usuario recibe access token + refresh token (cookie)
2. **Requests**: Cliente envía access token en header `Authorization: Bearer <token>`
3. **Expiración**: Cuando access token expira (5 min), usar refresh token
4. **Refresh**: POST a `/auth/refresh` con cookie → nuevo access token
5. **Logout**: Revoca refresh token en BD

## 🧪 Testing con cURL

```bash
# Registro
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123"}' \
  -c cookies.txt

# Perfil (con access token)
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer <access_token>"

# Refresh (con cookie)
curl -X POST http://localhost:3000/api/auth/refresh \
  -b cookies.txt
```

## 📦 Dependencias Principales

```json
{
  "@nestjs/jwt": "JWT support",
  "@nestjs/passport": "Passport integration",
  "@nestjs/typeorm": "TypeORM integration",
  "bcrypt": "Password hashing",
  "passport-jwt": "JWT strategy",
  "passport-local": "Local strategy",
  "cookie-parser": "Cookie parsing",
  "helmet": "Security headers",
  "class-validator": "DTO validation"
}
```

## 🤝 Mejores Prácticas Implementadas

1. ✅ Separación de access y refresh tokens
2. ✅ Refresh tokens en HttpOnly cookies
3. ✅ Revocación de tokens en base de datos
4. ✅ Límite de sesiones activas por usuario (5)
5. ✅ Limpieza automática de tokens expirados
6. ✅ Rate limiting por endpoint
7. ✅ Validación de DTOs
8. ✅ Guards globales y específicos
9. ✅ Decoradores personalizados
10. ✅ Sistema de roles flexible

## 📝 Notas Adicionales

### Rotación de Refresh Tokens

Cada vez que se usa un refresh token, se genera uno nuevo y el anterior se revoca (patrón de rotación).

### Manejo de Múltiples Dispositivos

El sistema soporta múltiples sesiones activas por usuario. Se guarda información de:
- User Agent
- IP Address
- Fecha de creación

### Two-Factor Authentication (preparado)

Las entidades ya incluyen campos para 2FA:
- `twoFactorSecret`
- `twoFactorEnabled`

## 📄 Licencia

MIT