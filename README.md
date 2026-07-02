# HANDYMAX - Multimax Despacho

> Plataforma de despacho y asignación de instalaciones en tiempo real para Multimax Panamá.

---

## Descripción

HANDYMAX es una plataforma web desarrollada para optimizar el proceso de asignación de trabajos de instalación de **Multimax Panamá**.

El sistema permite a los coordinadores publicar solicitudes de instalación, a los instaladores recibirlas y responder en tiempo real, y a los administradores gestionar instaladores, sucursales y operaciones mediante una arquitectura segura basada en roles.

El proyecto está construido utilizando tecnologías modernas del ecosistema React y Supabase, con una arquitectura modular y escalable que facilita su mantenimiento y evolución.

---

## Objetivos

- Digitalizar el proceso de asignación de instalaciones.
- Reducir tiempos de respuesta entre coordinadores e instaladores.
- Gestionar trabajos en tiempo real.
- Centralizar la administración de instaladores.
- Administrar sucursales y zonas de cobertura.
- Mantener historial completo de instalaciones.
- Facilitar la escalabilidad futura del sistema.

---

## Tecnologías

### Frontend

- React
- Vite
- TypeScript
- React Router
- TanStack Query
- Tailwind CSS
- shadcn/ui
- React Hook Form
- Zod
- Lucide React

### Backend

- Supabase
  - PostgreSQL
  - Authentication
  - Realtime
  - Storage
  - Edge Functions

### Herramientas

- Git
- GitHub
- ESLint
- Prettier

---

## Arquitectura

El proyecto sigue una arquitectura modular basada en funcionalidades (**Feature-Based Architecture**) separando completamente:

- Presentación
- Lógica de negocio
- Acceso a datos
- Integraciones
- Servicios

Toda interacción con la base de datos se realiza mediante una capa de servicios conectada a Supabase.

---

## Estructura del Proyecto

```text
src/
│
├── assets/
├── components/
│   ├── shared/
│   └── ui/
├── constants/
├── contexts/
├── features/
├── hooks/
├── layouts/
├── lib/
├── pages/
├── routes/
├── services/
├── styles/
├── supabase/
├── types/
└── utils/
```

---

## Flujo General

```text
Coordinador

      │

      ▼

Publica un trabajo

      │

      ▼

Supabase

      │

      ▼

Realtime

      │

      ▼

Instaladores reciben la solicitud

      │

      ▼

Envían propuesta

      │

      ▼

Coordinador selecciona instalador

      │

      ▼

Trabajo asignado

      │

      ▼

Seguimiento

      │

      ▼

Trabajo finalizado
```

---

## Roles del Sistema

### Coordinador

- Publicar trabajos.
- Visualizar respuestas.
- Asignar instaladores.
- Seguimiento de trabajos.
- Consultar historial.

### Instalador

- Recibir solicitudes.
- Enviar disponibilidad.
- Gestionar trabajos asignados.
- Actualizar perfil.

### Administrador

- Administrar instaladores.
- Administrar sucursales.
- Configurar zonas.
- Consultar estadísticas.
- Gestionar usuarios.

---

## Desarrollo

El proyecto se desarrolla de forma incremental mediante fases controladas.

Cada fase debe:

- Compilar correctamente.
- Pasar las validaciones.
- Mantener compatibilidad con la arquitectura.
- Actualizar la documentación técnica.

---

## Documentación del Proyecto

Toda la documentación técnica se encuentra en los siguientes archivos:

| Documento | Descripción |
|------------|-------------|
| ARCHITECTURE.md | Arquitectura técnica del sistema |
| PROJECT_STATUS.md | Estado actual del desarrollo |
| TODO.md | Lista de tareas y fases pendientes |
| CHANGELOG.md | Historial de cambios |

---

## Instalación

Clonar el repositorio:

```bash
git clone <repository-url>
```

Entrar al proyecto:

```bash
cd handymax-despacho
```

Instalar dependencias:

```bash
npm install
```

Configurar variables de entorno:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Ejecutar el proyecto:

```bash
npm run dev
```

---

## Scripts

```bash
npm run dev
```

Servidor de desarrollo.

```bash
npm run build
```

Generar versión de producción.

```bash
npm run lint
```

Validación del código.

```bash
npm run typecheck
```

Validación de TypeScript.

---

## Convenciones

- No acceder directamente a Supabase desde componentes.
- Toda consulta debe pasar por Services.
- No utilizar `any`.
- Mantener componentes pequeños y reutilizables.
- Toda nueva funcionalidad debe documentarse.
- Respetar la arquitectura definida en `ARCHITECTURE.md`.

---

## Estado del Proyecto

Actualmente el proyecto se encuentra en desarrollo por fases.

Cada fase es implementada por Claude Code, validada localmente y revisada antes de continuar con la siguiente.

---

## Licencia

Proyecto privado desarrollado para **Multimax Panamá**.

Todos los derechos reservados.

El código fuente, la documentación y los recursos asociados son de uso exclusivo del equipo autorizado para el desarrollo del proyecto.

---

## Desarrollado con ❤️ para Multimax Panamá