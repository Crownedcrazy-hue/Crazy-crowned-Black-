/*
 * ✏️  EDITA ESTE ARCHIVO PARA CAMBIAR TU TIENDA
 * No hace falta tocar index.html.
 */

const TIENDA = {
  nombre: 'Crazy Crowned',
  // Tu número de WhatsApp con código de país, sin + ni espacios. Ej: México 5215512345678, Colombia 573001234567
  whatsapp: '5210000000000',
  instagram: '', // opcional, sin @. Ej: 'crazycrowned'
  moneda: '$',
  formatoNumero: 'es-MX',
  titular: 'Viste como <em>realeza</em> 👑',
  descripcion: 'Ropa y accesorios con actitud. Elige lo que te gusta y pídelo directo por WhatsApp.',
  // Opciones de entrega que el cliente puede elegir (costo 0 = sin costo)
  entrega: [
    { nombre: 'Envío a domicilio', costo: 80 },
    { nombre: 'Recoger en persona', costo: 0 },
  ],
  envioGratisDesde: 1000, // pon 0 para desactivar el envío gratis
};

/*
 * PRODUCTOS
 * - id: texto único, sin espacios
 * - foto: sube la imagen a la carpeta tienda/fotos/ y pon 'fotos/nombre.jpg'.
 *         Si la dejas vacía se muestra una imagen de relleno con el color indicado.
 * - tallas: lista de tallas; deja [] para productos de talla única
 * - etiqueta: texto opcional sobre la foto ('Nuevo', '-20%', 'Más vendido'...)
 * - precioAntes: opcional, muestra el precio anterior tachado
 * - disponible: pon false cuando se agote
 */
const PRODUCTOS = [
  {
    id: 'playera-corona',
    nombre: 'Playera Crown Negra',
    categoria: 'Playeras',
    precio: 349,
    tallas: ['S', 'M', 'L', 'XL'],
    descripcion: 'Algodón 100%, estampado de corona dorada.',
    etiqueta: 'Nuevo',
    foto: '',
    color: '#3f3f46',
    disponible: true,
  },
  {
    id: 'playera-oversize',
    nombre: 'Playera Oversize Crazy',
    categoria: 'Playeras',
    precio: 399,
    precioAntes: 499,
    tallas: ['M', 'L', 'XL'],
    descripcion: 'Corte holgado, tela gruesa.',
    etiqueta: '-20%',
    foto: '',
    color: '#7c2d12',
    disponible: true,
  },
  {
    id: 'sudadera-king',
    nombre: 'Sudadera King',
    categoria: 'Sudaderas',
    precio: 749,
    tallas: ['S', 'M', 'L', 'XL'],
    descripcion: 'Con capucha y bordado frontal.',
    etiqueta: 'Más vendido',
    foto: '',
    color: '#1e3a8a',
    disponible: true,
  },
  {
    id: 'gorra-corona',
    nombre: 'Gorra Corona',
    categoria: 'Gorras',
    precio: 299,
    tallas: [],
    descripcion: 'Ajustable, talla única.',
    foto: '',
    color: '#14532d',
    disponible: true,
  },
  {
    id: 'cadena-dorada',
    nombre: 'Cadena Dorada',
    categoria: 'Accesorios',
    precio: 259,
    tallas: [],
    descripcion: 'Acero inoxidable baño de oro, 50 cm.',
    foto: '',
    color: '#713f12',
    disponible: true,
  },
  {
    id: 'pulsera-negra',
    nombre: 'Pulsera Black',
    categoria: 'Accesorios',
    precio: 149,
    tallas: [],
    descripcion: 'Cuentas de ónix con dije de corona.',
    foto: '',
    color: '#27272a',
    disponible: false,
  },
];
