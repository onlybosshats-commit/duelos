# MVS Duels 3D

Proyecto inicial de juego 3D multijugador inspirado en duelos por equipos. Usa personajes y escenario originales. La ronda es de persecución y captura por contacto, sin armas ni daño.

## Estructura
- `docs/`: juego web (HTML, CSS, JavaScript y Three.js).
- `server.js`: servidor Node.js + Socket.IO para salas y sincronización.
- `package.json`: dependencias y comando de arranque.

## Probar en tu computadora
1. Instala Node.js 18 o superior.
2. Abre una terminal dentro de esta carpeta.
3. Ejecuta `npm install`.
4. Ejecuta `npm start`.
5. Abre `http://localhost:3000`.

## Publicar online
GitHub Pages solo aloja la parte estática; no ejecuta el servidor Socket.IO. Separa el proyecto en dos despliegues:

### A. Servidor en Render
1. Sube TODO el proyecto a un repositorio GitHub.
2. En Render crea un **New Web Service** y conecta ese repositorio.
3. Runtime: Node.
4. Build Command: `npm install`
5. Start Command: `npm start`
6. Render asignará una URL HTTPS, por ejemplo `https://tu-servidor.onrender.com`.

### B. Cliente en GitHub Pages
1. En `docs/client.js`, busca la primera línea `const socket = io();`.
2. Cámbiala por `const socket = io("https://TU-SERVIDOR.onrender.com");` usando la URL real de Render.
3. En `docs/index.html`, cambia el script de Socket.IO `/socket.io/socket.io.js` por `https://TU-SERVIDOR.onrender.com/socket.io/socket.io.js`.
4. En GitHub entra a Settings → Pages.
5. En Build and deployment elige Deploy from a branch, branch `main`, carpeta `/docs`, y guarda.
6. Abre la URL de GitHub Pages.

## Importante
- Render puede suspender servicios gratuitos cuando no reciben tráfico; la primera conexión puede tardar.
- Esta es una primera versión funcional para probar salas y movimiento. Todavía faltan cuentas, persistencia, moderación, matchmaking avanzado y pruebas de carga.
- No contiene los assets originales de Roblox ni copia el código privado del juego de referencia.
