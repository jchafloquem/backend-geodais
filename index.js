require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000; // Puerto

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Aumentamos el límite para recibir fotos en Base64

// Conexión a Base de Datos (DEVIDA)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});


// --- ENDPOINT PRINCIPAL ---
/* app.post('/geodaismovil/registros/single', async (req, res) => {
  const client = await pool.connect();
  
  try {
    // 1. Recibir datos del Body
    const data = req.body;
    console.log('Recibiendo registro:', data.internal_key);

    // 2. Iniciar Transacción (Todo o nada)
    await client.query('BEGIN');

    // 3. Insertar Productor
    const insertProductorQuery = `
      INSERT INTO registros_productor (
        internal_key, 
        dni_productor, 
        nombre_completo, 
        nombres, 
        apellido_paterno, 
        apellido_materno,
        fecha_nacimiento, 
        sexo, 
        celular_participante, 
        actividad_agraria, 
        tipo_cultivo,
        superficie_midagri, 
        regimen_tenencia, 
        tipo_productor,
        geom, 
        centroide, 
        area_ha, 
        perimetro_m,
        txt_departamento, 
        txt_provincia, 
        txt_distrito, 
        ubigeo_distrito,
        profesional_dni, 
        profesional_nombres, 
        profesional_apellidos, 
        profesional_celular, 
        profesional_email, 
        device_uuid
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
        ST_GeomFromText($15, 4326), $16, $17, $18,
        $19, $20, $21, $22,
        $23, $24, $25, $26, $27, $28
      )
      ON CONFLICT (internal_key) DO UPDATE SET
        fecha_creacion = CURRENT_TIMESTAMP; -- Simple actualización si ya existe para no fallar
    `;

    const productorValues = [
      data.internal_key, data.dni_productor, data.nombre_completo, data.nombres, data.apellido_paterno, data.apellido_materno,
      data.fecha_nacimiento || null, data.sexo, data.celular_participante, data.actividad_agraria, data.tipo_cultivo,
      data.superficie_midagri, data.regimen_tenencia, data.tipo_productor,
      data.geom, data.centroide, data.area_ha, data.perimetro_m,
      data.txt_departamento, data.txt_provincia, data.txt_distrito, data.ubigeo_distrito,
      data.profesional_dni, data.profesional_nombres, data.profesional_apellidos, data.profesional_celular, data.profesional_email, data.device_uuid
    ];

    await client.query(insertProductorQuery, productorValues);

    // 4. Insertar Fotos (Si existen)
    if (data.fotos_asociadas && data.fotos_asociadas.length > 0) {
      // Primero borramos fotos anteriores de este registro para evitar duplicados al re-sincronizar
      await client.query('DELETE FROM fotos_registro WHERE internal_key = $1', [data.internal_key]);

      const insertFotoQuery = `
        INSERT INTO fotos_registro (internal_key, tipo_foto, ruta_foto)
        VALUES ($1, $2, $3)
      `;

      for (const foto of data.fotos_asociadas) {
        // NOTA: Aquí 'ruta_foto' guardará lo que envíe el móvil. 
        // Si envías Base64, se guardará el string largo.
        await client.query(insertFotoQuery, [data.internal_key, foto.tipo_foto, foto.ruta_foto]);
      }
    }

    // 5. Confirmar Transacción
    await client.query('COMMIT');
    console.log('Registro guardado con éxito:', data.internal_key);
    res.status(200).json({ success: true, message: 'Registro guardado correctamente' });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al guardar registro:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    client.release();
  }
}); */

// Endpoint de prueba
app.get('/', (req, res) => {
  res.send('Backend GeoDAIS funcionando 🚀');
});

// ENPOINT PARA OBTENER TODOS LOS REGISTROS PARA EL PANEL WEB
// Agregamos el prefijo /geodaismovil para que coincida con el resto de la app
app.get('/geodaismovil/api/registros', async (req, res) => {
  const client = await pool.connect();
  try {
    // Corregido: Agrupamos solo por internal_key (que es la clave única en tu lógica)
    // Esto resuelve el error 42703 ya que r.id no existe en registros_productor
    const registrosQuery = `
      SELECT 
        r.*, 
        ST_AsGeoJSON(r.geom) as geojson,
        COALESCE(
          json_agg(
            json_build_object(
              'id', f.id, 
              'tipo_foto', f.tipo_foto, 
              'url', 'data:image/jpeg;base64,' || f.ruta_foto
            )
          ) FILTER (WHERE f.id IS NOT NULL), '[]'
        ) as fotos
      FROM registros_productor r
      LEFT JOIN fotos_registro f ON r.internal_key = f.internal_key
      GROUP BY r.internal_key -- Usamos internal_key porque es la clave única/primaria
      ORDER BY r.fecha_creacion DESC;
    `;

    const registrosResult = await client.query(registrosQuery);
    const registros = registrosResult.rows;

    // Parsear el GeoJSON de string a objeto para que Leaflet lo entienda
    registros.forEach(reg => {
      if (reg.geojson) {
        reg.geojson = JSON.parse(reg.geojson);
      }
    });

    res.status(200).json(registros);

  } catch (error) {
    console.error('Error al obtener registros:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    client.release();
  }
});

app.listen(port, () => {
  console.log(`Servidor escuchando en el puerto ${port}`);
});
