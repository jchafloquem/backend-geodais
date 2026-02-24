# Backend GeoMovilDAIS

Backend para la aplicación GeoMovilDAIS. Este servicio está construido con Node.js y Express, y se encarga de recibir, procesar y almacenar los registros de productores agrícolas enviados desde la aplicación móvil.

## Características

- **API RESTful**: Endpoints para la creación y consulta de registros.
- **Base de Datos PostgreSQL**: Integración con una base de datos PostgreSQL, optimizada para servicios como Neon.
- **Soporte Geoespacial**: Utiliza PostGIS para almacenar y consultar datos geográficos (geometrías de parcelas).
- **Manejo de Imágenes**: Capacidad para recibir y almacenar imágenes en formato Base64 asociadas a cada registro.
- **Transacciones Atómicas**: Asegura la integridad de los datos al guardar un registro y sus fotos en una única operación (todo o nada).
- **Configuración Sencilla**: Usa variables de entorno para una configuración flexible entre entornos de desarrollo y producción.

## Prerrequisitos

- [Node.js](https://nodejs.org/) (versión 14.x o superior)
- [NPM](https://www.npmjs.com/)
- Una base de datos PostgreSQL con la extensión PostGIS habilitada. Puedes usar un servicio en la nube como [Neon](https://neon.tech/).

## Instalación

1.  Clona este repositorio en tu máquina local:
    ```bash
    git clone <URL-DEL-REPOSITORIO>
    ```

2.  Navega al directorio del proyecto:
    ```bash
    cd GeoMovilDAIS_BackEnd
    ```

3.  Instala las dependencias del proyecto:
    ```bash
    npm install
    ```

4.  Crea un archivo `.env` en la raíz del proyecto. Puedes copiar el archivo `.env.example` como plantilla:
    ```bash
    cp .env.example .env
    ```

5.  Edita el archivo `.env` con la configuración de tu base de datos y el puerto para el servidor:
    ```ini
    # Puerto en el que se ejecutará el servidor
    PORT=3000

    # URL de conexión a tu base de datos PostgreSQL (ejemplo para Neon)
    DATABASE_URL="postgresql://user:password@host:port/dbname?sslmode=require"
    ```

## Uso

Para iniciar el servidor en modo de desarrollo, ejecuta:

```bash
npm start
```

O directamente con Node:

```bash
node index.js
```

El servidor estará escuchando en el puerto que hayas definido en tu archivo `.env` (por defecto, el puerto 3000).

## API Endpoints

A continuación se describen los endpoints disponibles en la API.

### `GET /`

- **Descripción**: Endpoint de prueba para verificar que el servidor está funcionando correctamente.
- **Respuesta Exitosa (200)**:
  ```
  Backend GeoDAIS funcionando 🚀
  ```

### `POST /api/registros/single`

- **Descripción**: Recibe y guarda un único registro de productor, incluyendo sus datos y fotos asociadas. La operación es transaccional. Si un registro con la misma `internal_key` ya existe, se actualiza su fecha de creación y se reemplazan las fotos.
- **Cuerpo de la Petición (Body)**: Un objeto JSON con la estructura de un registro.
  - `internal_key` (String): Identificador único generado en el dispositivo móvil.
  - `dni_productor`, `nombre_completo`, etc.: Datos del productor.
  - `geom` (String): Geometría de la parcela en formato WKT (Well-Known Text).
  - `fotos_asociadas` (Array): Un arreglo de objetos, donde cada objeto representa una foto.
    - `tipo_foto` (String): El tipo de foto (ej: 'DNI', 'PARCELA').
    - `ruta_foto` (String): La imagen codificada en Base64.

- **Respuesta Exitosa (200)**:
  ```json
  {
    "success": true,
    "message": "Registro guardado correctamente"
  }
  ```
- **Respuesta de Error (500)**:
  ```json
  {
    "success": false,
    "error": "Mensaje detallado del error"
  }
  ```

### `GET /api/registros`

- **Descripción**: Devuelve una lista de todos los registros de productores almacenados en la base de datos. Este endpoint está pensado para ser consumido por un panel web de visualización.
- **Respuesta Exitosa (200)**: Un arreglo de objetos JSON, donde cada objeto es un registro de productor.
  - Incluye todos los campos de la tabla `registros_productor`.
  - `geojson` (Object): La geometría del registro en formato GeoJSON, lista para ser usada en mapas interactivos.
  - `fotos` (Array): Un arreglo con las fotos asociadas. Cada objeto de foto incluye una `url` en formato `data:image/jpeg;base64,...` para ser mostrada directamente en una etiqueta `<img>` en el frontend.

- **Ejemplo de un objeto en la respuesta**:
  ```json
  {
    "internal_key": "some-unique-id",
    "nombre_completo": "Juan Perez",
    "geojson": { "type": "Polygon", "coordinates": [...] },
    "fotos": [
      { "id": 1, "tipo_foto": "DNI", "url": "data:image/jpeg;base64,..." }
    ],
    ...
  }
  ```