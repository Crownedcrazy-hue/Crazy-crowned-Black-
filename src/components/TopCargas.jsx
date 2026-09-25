import { useMemo, useState } from 'react'
import { grupos, generarCargas } from '../data/cargas'
import { topCargasDelDia, formatoPesos } from '../utils/topCargas'

const MEDALLAS = ['🥇', '🥈', '🥉']

export default function TopCargas({ searchQuery = '' }) {
  const [grupoId, setGrupoId] = useState('todos')
  const hoy = new Date()
  const cargas = useMemo(() => generarCargas(), [])

  const ranking = topCargasDelDia(cargas, { grupoId, fecha: hoy })
  const q = searchQuery.toLowerCase()
  const filas = q ? ranking.filter(f => f.usuario.toLowerCase().includes(q)) : ranking

  const total = ranking.reduce((s, f) => s + f.total, 0)
  const cantidad = ranking.reduce((s, f) => s + f.cantidad, 0)
  const grupoPorId = Object.fromEntries(grupos.map(g => [g.id, g]))
  const fecha = hoy.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
  const fechaTxt = fecha.charAt(0).toUpperCase() + fecha.slice(1)

  return (
    <div style={{ padding: '0 12px' }}>
      <div style={resumen}>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
          🏆 Top cargas · {fechaTxt}
        </div>
        <div style={{ fontSize: 26, fontWeight: 700, marginTop: 4 }}>{formatoPesos(total)}</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>
          {cantidad} cargas · {ranking.length} usuarios
        </div>
      </div>

      <div style={chips}>
        {[{ id: 'todos', nombre: 'Todos' }, ...grupos].map(g => (
          <button key={g.id} onClick={() => setGrupoId(g.id)} style={chip(grupoId === g.id)}>
            {g.color && <span style={{ ...dot, background: g.color }} />}
            {g.nombre}
          </button>
        ))}
      </div>

      <div style={tabla}>
        <div style={{ ...fila, ...encabezado }}>
          <span style={colPos}>#</span>
          <span style={colUsuario}>Usuario</span>
          <span style={colCargas}>Cargas</span>
          <span style={colTotal}>Total</span>
        </div>
        {filas.length === 0 && (
          <div style={{ padding: '28px 0', textAlign: 'center', color: '#8e8e93', fontSize: 14 }}>
            Sin cargas hoy
          </div>
        )}
        {filas.map(f => {
          const pos = ranking.indexOf(f)
          const g = grupoPorId[f.grupoId]
          return (
            <div key={`${f.grupoId}:${f.usuario}`} style={fila}>
              <span style={{ ...colPos, fontSize: pos < 3 ? 18 : 13 }}>{MEDALLAS[pos] || pos + 1}</span>
              <span style={colUsuario}>
                <span style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#1c1c1e' }}>{f.usuario}</span>
                {grupoId === 'todos' && (
                  <span style={{ fontSize: 11, color: g.color, fontWeight: 500 }}>{g.nombre}</span>
                )}
              </span>
              <span style={colCargas}>{f.cantidad}</span>
              <span style={{ ...colTotal, fontWeight: 700, color: '#1c1c1e' }}>{formatoPesos(f.total)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const resumen = {
  background: '#1c1c1e',
  color: '#fff',
  borderRadius: 16,
  padding: '14px 16px',
  marginBottom: 10,
}

const chips = {
  display: 'flex',
  gap: 6,
  overflowX: 'auto',
  paddingBottom: 10,
}

const chip = active => ({
  display: 'flex',
  alignItems: 'center',
  gap: 5,
  padding: '5px 12px',
  borderRadius: 16,
  fontSize: 13,
  fontWeight: 500,
  whiteSpace: 'nowrap',
  background: active ? '#1c1c1e' : '#fff',
  color: active ? '#fff' : '#3c3c43',
  boxShadow: active ? 'none' : '0 1px 3px rgba(0,0,0,0.08)',
})

const dot = { width: 8, height: 8, borderRadius: '50%', flexShrink: 0 }

const tabla = {
  background: '#fff',
  borderRadius: 14,
  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  overflow: 'hidden',
}

const fila = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '10px 14px',
  borderBottom: '1px solid #f2f2f7',
  fontSize: 13,
  color: '#3c3c43',
}

const encabezado = {
  fontSize: 11,
  fontWeight: 600,
  color: '#8e8e93',
  textTransform: 'uppercase',
  letterSpacing: 0.4,
  padding: '8px 14px',
}

const colPos = { width: 28, textAlign: 'center', flexShrink: 0 }
const colUsuario = { flex: 1, minWidth: 0 }
const colCargas = { width: 50, textAlign: 'center', flexShrink: 0 }
const colTotal = { width: 90, textAlign: 'right', flexShrink: 0 }
