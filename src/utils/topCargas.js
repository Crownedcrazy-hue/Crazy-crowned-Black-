const mismoDia = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate()

// Ranking de usuarios por total cargado en el día `fecha`.
// grupoId = 'todos' incluye todos los grupos.
export function topCargasDelDia(cargas, { grupoId = 'todos', fecha = new Date() } = {}) {
  const porUsuario = new Map()
  for (const c of cargas) {
    if (!mismoDia(c.fecha, fecha)) continue
    if (grupoId !== 'todos' && c.grupoId !== grupoId) continue
    const key = `${c.grupoId}:${c.usuario}`
    const fila = porUsuario.get(key) || { usuario: c.usuario, grupoId: c.grupoId, total: 0, cantidad: 0, ultima: c.fecha }
    fila.total += c.monto
    fila.cantidad += 1
    if (c.fecha > fila.ultima) fila.ultima = c.fecha
    porUsuario.set(key, fila)
  }
  return [...porUsuario.values()].sort((a, b) => b.total - a.total || b.cantidad - a.cantidad)
}

export const formatoPesos = n =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)
