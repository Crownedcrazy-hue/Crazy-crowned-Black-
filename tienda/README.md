# Tienda Crazy Crowned 👑

Catálogo web para vender por redes. El cliente elige productos y talla, y al pulsar
**"Enviar pedido por WhatsApp"** se abre tu chat con el pedido ya escrito (productos,
tallas, total, nombre y dirección).

## Cómo editarla
Todo se cambia en **`productos.js`**:
1. `whatsapp`: tu número con código de país, sin `+` ni espacios.
2. `moneda`, `entrega` (costos de envío) y `envioGratisDesde`.
3. La lista `PRODUCTOS`: nombre, precio, tallas, categoría, etiqueta, `disponible`.
4. Fotos: súbelas a `tienda/fotos/` y pon `foto: 'fotos/mi-foto.jpg'`
   (mejor verticales 4:5, ej. 800×1000).

## Publicarla gratis
- **Render**: en render.com → *New → Blueprint* → elige este repo. Se crea el sitio
  `crazy-crowned-tienda` con un link público.
- **Netlify**: arrastra la carpeta `tienda` a app.netlify.com/drop.

Pon el link en la bio de Instagram/TikTok, en tu perfil de WhatsApp Business
y compártelo en tus estados.

## Probar en tu compu
Abre `tienda/index.html` en el navegador.
