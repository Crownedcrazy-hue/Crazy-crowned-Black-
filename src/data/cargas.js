// Datos de ejemplo (ficticios). Cada carga se genera sobre la fecha actual
// según `diasAtras`, para que "hoy" siempre tenga movimiento en la demo.
export const grupos = [
  { id: 'vip', nombre: 'Grupo VIP', color: '#7c3aed' },
  { id: 'norte', nombre: 'Grupo Norte', color: '#0891b2' },
  { id: 'sur', nombre: 'Grupo Sur', color: '#d97706' },
]

const CARGAS_DEMO = [
  { usuario: 'Lucas M.', grupoId: 'vip', monto: 15000, hora: '09:12', diasAtras: 0 },
  { usuario: 'Lucas M.', grupoId: 'vip', monto: 20000, hora: '13:40', diasAtras: 0 },
  { usuario: 'Lucas M.', grupoId: 'vip', monto: 10000, hora: '18:05', diasAtras: 0 },
  { usuario: 'Valeria T.', grupoId: 'vip', monto: 30000, hora: '11:20', diasAtras: 0 },
  { usuario: 'Valeria T.', grupoId: 'vip', monto: 5000, hora: '16:55', diasAtras: 0 },
  { usuario: 'Diego F.', grupoId: 'vip', monto: 8000, hora: '10:02', diasAtras: 0 },
  { usuario: 'Diego F.', grupoId: 'vip', monto: 50000, hora: '21:30', diasAtras: 1 },
  { usuario: 'Carla B.', grupoId: 'norte', monto: 12000, hora: '08:45', diasAtras: 0 },
  { usuario: 'Carla B.', grupoId: 'norte', monto: 12000, hora: '12:10', diasAtras: 0 },
  { usuario: 'Carla B.', grupoId: 'norte', monto: 6000, hora: '19:25', diasAtras: 0 },
  { usuario: 'Nico S.', grupoId: 'norte', monto: 25000, hora: '15:00', diasAtras: 0 },
  { usuario: 'Pablo G.', grupoId: 'norte', monto: 3000, hora: '09:58', diasAtras: 0 },
  { usuario: 'Pablo G.', grupoId: 'norte', monto: 4000, hora: '17:14', diasAtras: 0 },
  { usuario: 'Nico S.', grupoId: 'norte', monto: 40000, hora: '22:40', diasAtras: 1 },
  { usuario: 'Romina L.', grupoId: 'sur', monto: 18000, hora: '10:30', diasAtras: 0 },
  { usuario: 'Romina L.', grupoId: 'sur', monto: 7000, hora: '14:22', diasAtras: 0 },
  { usuario: 'Tomás V.', grupoId: 'sur', monto: 9000, hora: '11:47', diasAtras: 0 },
  { usuario: 'Tomás V.', grupoId: 'sur', monto: 9000, hora: '13:03', diasAtras: 0 },
  { usuario: 'Tomás V.', grupoId: 'sur', monto: 2000, hora: '20:18', diasAtras: 0 },
  { usuario: 'Agus P.', grupoId: 'sur', monto: 1500, hora: '16:36', diasAtras: 0 },
  { usuario: 'Agus P.', grupoId: 'sur', monto: 60000, hora: '23:10', diasAtras: 2 },
]

export function generarCargas(base = new Date()) {
  return CARGAS_DEMO.map((c, i) => {
    const [hh, mm] = c.hora.split(':').map(Number)
    const fecha = new Date(base.getFullYear(), base.getMonth(), base.getDate() - c.diasAtras, hh, mm)
    return { id: i + 1, usuario: c.usuario, grupoId: c.grupoId, monto: c.monto, fecha }
  })
}
