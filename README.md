# PetCareApp

Plataforma web para la gestión de servicios integrales para mascotas: registro de propietarios y mascotas, citas veterinarias, vacunación, peluquería, recordatorios y panel de administración.

Proyecto de la asignatura Gerencia de Proyectos Informáticos, Politécnico Grancolombiano (Grupo B03, Subgrupo 27).

**Tecnologías:** Node.js + Express (API REST) · React + Vite (frontend) · PostgreSQL (base de datos) · JWT + bcrypt (seguridad).

---

## 1. Ejecutar en tu computador (Windows)

Requisito: tener instalado [Node.js](https://nodejs.org) 18 o superior. No hace falta instalar PostgreSQL: en local se usa una versión embebida que guarda los datos en la carpeta `data/`.

Abre **CMD** y ejecuta:

```cmd
cd %USERPROFILE%\Documents\petcareapp
npm run setup
npm run build
npm start
```

Luego abre <http://localhost:3000> en el navegador.

- `npm run setup` instala las dependencias del backend y del frontend (solo la primera vez).
- `npm run build` compila el frontend (repítelo cada vez que cambies algo en `client/`).
- `npm start` inicia el servidor.

### Usuario administrador inicial

| Correo | Contraseña |
| --- | --- |
| admin@petcareapp.com | Admin123* |

Se crea automáticamente la primera vez. Para cambiarlo, copia `.env.example` como `.env` y edita `ADMIN_EMAIL` y `ADMIN_PASSWORD` **antes** del primer arranque.

### Modo desarrollo (recarga automática)

Usa dos ventanas de CMD:

```cmd
:: Ventana 1 - backend en http://localhost:3000
npm run dev

:: Ventana 2 - frontend en http://localhost:5173
cd client
npm run dev
```

---

## 2. Publicar en un servidor público (gratis)

Se usan dos servicios gratuitos: **Neon** para la base de datos PostgreSQL y **Render** para la aplicación.

1. **Base de datos (Neon).** Crea una cuenta en <https://neon.tech>, crea un proyecto y copia la *connection string* (empieza por `postgresql://...`).
2. **Código en GitHub.** Sube la carpeta `petcareapp` a un repositorio de GitHub. El `.gitignore` ya excluye `node_modules`, `data` y `.env`.
3. **Aplicación (Render).** En <https://render.com> elige *New → Blueprint* y selecciona el repositorio; Render leerá `render.yaml`. Cuando lo pida, completa:
   - `DATABASE_URL`: la connection string de Neon.
   - `ADMIN_PASSWORD`: la contraseña que tendrá el administrador.
4. Al terminar el despliegue, Render te da una URL pública del tipo `https://petcareapp-xxxx.onrender.com`.

Las tablas se crean solas al iniciar. Verifica que el servidor responde en `/api/salud`.

> En el plan gratuito de Render el servidor "se duerme" tras 15 minutos sin uso; la primera visita puede tardar unos 50 segundos en cargar. Ábrelo unos minutos antes de presentarlo.

---

## 3. Funcionalidades y trazabilidad con los requerimientos

| Requerimiento | Caso de uso | Dónde está |
| --- | --- | --- |
| RF01 Registrar propietarios | CU-01 | Pantalla *Registrarse* · `POST /api/auth/registro` |
| RF09 Iniciar sesión | CU-02 | Pantalla *Iniciar sesión* · `POST /api/auth/login` |
| RF02 Registrar mascotas | CU-03 | *Mis mascotas* · `POST /api/mascotas` |
| RF03 Actualizar mascotas | CU-04 | *Mis mascotas → Editar* · `PUT /api/mascotas/:id` |
| RF04 Solicitar citas | CU-05 | *Citas → Solicitar cita* (muestra solo horarios libres) · `POST /api/citas` |
| RF08 Consultar citas | CU-06 | *Citas veterinarias* · `GET /api/citas` |
| RF05 Historial de servicios | CU-07 | *Mis mascotas → Historial* · `GET /api/mascotas/:id` |
| RF06 Registrar vacunaciones | CU-08, CU-14 | *Vacunación* (el administrador registra) · `/api/vacunas` |
| RF10 Solicitar peluquería | CU-09 | *Peluquería* · `POST /api/servicios` |
| RF07 Generar recordatorios | CU-10 | *Inicio → Recordatorios* · `GET /api/recordatorios` |
| RF11 Editar propietario | — | *Mi perfil* · `PUT /api/auth/perfil` |
| RF12 Cancelar cita | — | *Citas → Cancelar* · `PATCH /api/citas/:id/cancelar` |
| — | CU-11 Gestionar usuarios | *Usuarios* (admin) · `/api/admin/usuarios` |
| — | CU-12 Gestionar mascotas | *Mascotas* (admin ve todas) |
| — | CU-13 Gestionar citas | *Citas* (admin cambia el estado) |
| — | CU-15 Gestionar servicios | *Peluquería* (admin cambia el estado) |
| — | CU-16 Generar reportes | *Reportes* (admin, exporta CSV) · `GET /api/admin/reportes` |

**Recordatorios:** citas y servicios de los próximos 7 días, y vacunas cuya próxima dosis vence en 30 días o ya venció.

**Reglas de negocio:** atención de lunes a sábado de 08:00 a 17:30 en franjas de 30 minutos; no se permiten dos citas en la misma franja ni fechas pasadas.

**Seguridad (RNF03):** contraseñas cifradas con bcrypt, sesiones con JWT (8 horas), consultas parametrizadas contra inyección SQL y control de acceso por rol.

---

## 4. Estructura del proyecto

```
petcareapp/
├── server/                 Backend (API REST)
│   ├── index.js            Arranque del servidor
│   ├── db.js               Conexión a PostgreSQL / PostgreSQL embebido
│   ├── schema.sql          Tablas (modelo entidad-relación)
│   ├── middleware/auth.js  Autenticación y roles
│   └── routes/             auth, mascotas, citas, vacunas, servicios, recordatorios, admin
├── client/                 Frontend (React)
│   └── src/pages/          Una pantalla por módulo
├── .env.example            Variables de configuración
└── render.yaml             Configuración de despliegue en Render
```

## 5. Base de datos

Implementa las cinco tablas del modelo entidad-relación de la Entrega 2 (`propietario`, `mascota`, `cita`, `vacuna`, `servicio`) con sus llaves foráneas 1:N. Ajustes de implementación:

- `propietario.rol`: distingue al Propietario del Administrador.
- `mascota.especie`: tipo de animal.
- `cita.motivo`: motivo de la consulta.
- `vacuna.fecha_proxima`: fecha del refuerzo, usada para los recordatorios.
