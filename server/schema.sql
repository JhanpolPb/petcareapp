-- PetCareApp - Esquema de base de datos
-- Basado en el Modelo Entidad Relación y el Diccionario de Datos (Entrega 2).
-- Ajustes de implementación:
--   * propietario.rol      -> distingue los actores Propietario y Administrador (casos de uso CU-11 a CU-16)
--   * vacuna.fecha_proxima -> permite generar recordatorios de vacunación (RF07 / CU-10)
--   * cita.motivo          -> motivo de la consulta veterinaria
--   * mascota.especie      -> tipo de animal (perro, gato, etc.)
--   * creado_en            -> trazabilidad de registros

CREATE TABLE IF NOT EXISTS propietario (
  id_propietario SERIAL PRIMARY KEY,
  nombre         VARCHAR(100) NOT NULL,
  telefono       VARCHAR(20)  NOT NULL,
  correo         VARCHAR(100) NOT NULL UNIQUE,
  contrasena     VARCHAR(100) NOT NULL,
  rol            VARCHAR(20)  NOT NULL DEFAULT 'propietario' CHECK (rol IN ('propietario', 'admin')),
  creado_en      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS mascota (
  id_mascota     SERIAL PRIMARY KEY,
  id_propietario INT          NOT NULL REFERENCES propietario(id_propietario) ON DELETE CASCADE,
  nombre_mascota VARCHAR(50)  NOT NULL,
  especie        VARCHAR(30)  NOT NULL DEFAULT 'Perro',
  raza           VARCHAR(50)  NOT NULL,
  edad           INT          NOT NULL CHECK (edad >= 0 AND edad <= 99),
  sexo           VARCHAR(10)  NOT NULL CHECK (sexo IN ('Macho', 'Hembra')),
  creado_en      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cita (
  id_cita    SERIAL PRIMARY KEY,
  id_mascota INT         NOT NULL REFERENCES mascota(id_mascota) ON DELETE CASCADE,
  fecha      DATE        NOT NULL,
  hora       TIME        NOT NULL,
  motivo     VARCHAR(200),
  estado     VARCHAR(20) NOT NULL DEFAULT 'Programada'
             CHECK (estado IN ('Programada', 'Atendida', 'Cancelada')),
  creado_en  TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vacuna (
  id_vacuna        SERIAL PRIMARY KEY,
  id_mascota       INT         NOT NULL REFERENCES mascota(id_mascota) ON DELETE CASCADE,
  nombre           VARCHAR(50) NOT NULL,
  fecha_aplicacion DATE        NOT NULL,
  fecha_proxima    DATE,
  creado_en        TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS servicio (
  id_servicio    SERIAL PRIMARY KEY,
  id_mascota     INT         NOT NULL REFERENCES mascota(id_mascota) ON DELETE CASCADE,
  tipo_servicio  VARCHAR(50) NOT NULL,
  fecha_servicio DATE        NOT NULL,
  estado         VARCHAR(20) NOT NULL DEFAULT 'Solicitado'
                 CHECK (estado IN ('Solicitado', 'Confirmado', 'Realizado', 'Cancelado')),
  creado_en      TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_mascota_propietario ON mascota(id_propietario);
CREATE INDEX IF NOT EXISTS idx_cita_mascota ON cita(id_mascota);
CREATE INDEX IF NOT EXISTS idx_cita_fecha ON cita(fecha, hora);
CREATE INDEX IF NOT EXISTS idx_vacuna_mascota ON vacuna(id_mascota);
CREATE INDEX IF NOT EXISTS idx_servicio_mascota ON servicio(id_mascota);
