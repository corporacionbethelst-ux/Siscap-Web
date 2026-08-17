-- ============================================================
-- MIGRACIÓN: Sistema de Zonas Geográficas
-- Agrega las columnas y tablas necesarias sin perder datos existentes
-- ============================================================

-- 1. Crear tabla zonas si no existe
CREATE TABLE IF NOT EXISTS zonas (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) UNIQUE NOT NULL,
    descripcion VARCHAR(255),
    estatus VARCHAR(20) DEFAULT 'ACTIVO',
    fecha_registro TIMESTAMP DEFAULT NOW()
);

-- 2. Agregar columna zona a sesiones si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sesiones' AND column_name = 'zona'
    ) THEN
        ALTER TABLE sesiones ADD COLUMN zona VARCHAR(100);
    END IF;
END $$;

-- 3. Agregar columna zona_id a puntos_control si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'puntos_control' AND column_name = 'zona_id'
    ) THEN
        ALTER TABLE puntos_control ADD COLUMN zona_id INTEGER;
        ALTER TABLE puntos_control 
            ADD CONSTRAINT fk_puntos_control_zona 
            FOREIGN KEY (zona_id) REFERENCES zonas(id);
    END IF;
END $$;

-- 4. Insertar zonas iniciales si la tabla está vacía
INSERT INTO zonas (nombre, descripcion)
SELECT nombre, descripcion FROM (VALUES
    ('MACAGUA', 'Zona industrial Macagua'),
    ('TOCOMA', 'Zona Tocoma'),
    ('GURI', 'Zona Guri - Central Hidroeléctrica'),
    ('CARUACHI', 'Zona Caruachi - Central Hidroeléctrica'),
    ('EDIFICIO SEDE', 'Edificio sede corporativo'),
    ('TORRE CORPORATIVA', 'Torre corporativa')
) AS nuevas_zonas(nombre, descripcion)
WHERE NOT EXISTS (
    SELECT 1 FROM zonas WHERE zonas.nombre = nuevas_zonas.nombre
);

-- 5. Actualizar sesiones existentes sin zona (asignar zona por defecto)
UPDATE sesiones 
SET zona = 'POR DEFINIR' 
WHERE zona IS NULL;

-- ============================================================
-- Verificación
-- ============================================================
SELECT 'Zonas creadas: ' || COUNT(*) FROM zonas;
SELECT 'Sesiones actualizadas: ' || COUNT(*) FROM sesiones WHERE zona = 'POR DEFINIR';