# Cubolandia

Juego de bloques en 3D para el celular y la computadora, con multijugador online, chat de texto y chat de voz.

- `server.js`: servidor en Node.js. Muestra la página del juego y conecta a los jugadores por WebSocket: posiciones, bloques, chat y la señal para la voz.
- `public/index.html`: el juego completo (three.js).
- El mundo compartido se guarda en `world.json`.

## Probarlo en tu computadora

```bash
cd cubolandia
npm install
npm start
```

Abrí http://localhost:3000 en dos pestañas para ver dos jugadores.

## Subirlo gratis a Render

1. Creá una cuenta en https://render.com y entrá con GitHub.
2. Tocá **New** → **Blueprint** y elegí este repositorio. Render lee `render.yaml` y arma el servicio solo.
3. Esperá a que diga **Live**. Te da un enlace del tipo `https://cubolandia-xxxx.onrender.com`.
4. Ese enlace es el que mandás por WhatsApp. Sirve para jugar y para la voz, porque es `https`.

### Lo que hay que saber del plan gratis

- Si nadie juega por 15 minutos, el servidor se duerme. El primero que entra espera cerca de un minuto hasta que despierta.
- Cuando el servidor se reinicia, el mundo vuelve a empezar de cero. Para que no se borre, agregá un disco (Render → **Disks**, es pago) y poné la variable `DATA_FILE` apuntando a ese disco, por ejemplo `/var/data/world.json`.

## Chat de voz

- Cada jugador toca **🎤 Voz** y le da permiso al micrófono.
- La voz va directo entre los teléfonos (WebRTC). El servidor solo los ayuda a encontrarse.
- Con muchos jugadores hablando a la vez (más de 6 u 8) el teléfono puede calentarse.
- En algunas redes de datos móviles la voz no conecta. Con wifi anda mejor. Si pasa seguido, hace falta un servidor TURN (por ejemplo el plan gratis de Metered o Twilio) y sumarlo en `ICE` dentro de `public/index.html`.

## Variables

| Variable | Para qué | Por defecto |
|---|---|---|
| `PORT` | Puerto del servidor | `3000` |
| `MAX_PLAYERS` | Máximo de jugadores a la vez | `16` |
| `DATA_FILE` | Dónde se guarda el mundo | `cubolandia/world.json` |
