'use client'

import { useRouter } from 'next/navigation'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'

const STATUS_COLORS: Record<string, string> = {
  DISPARO_REALIZADO: '#94a3b8',
  INTERESSADO: '#16a34a',
  FORMULARIO_ENVIADO: '#2563eb',
  SEM_RESPOSTA: '#d97706',
  OPT_OUT: '#dc2626',
  NAO_QUALIFICADO: '#dc2626',
  AGUARDANDO: '#7c3aed',
  DESCARTADO: '#cbd5e1',
}

const TOOLTIP_STYLE = {
  background: '#ffffff',
  border: '1px solid #e3e6ec',
  borderRadius: 8,
  fontSize: 12,
  boxShadow: '0 4px 12px rgba(16,24,40,0.08)',
} as const
const TOOLTIP_LABEL = { color: '#1c2230', fontWeight: 600 } as const

export function MensagensPorDia({
  data,
}: {
  data: Array<{ dia: string; recebidas: number; enviadas: number }>
}) {
  return (
    <div className="chart-card">
      <div className="chart-title">Mensagens — últimos 7 dias</div>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e3e6ec" />
          <XAxis dataKey="dia" stroke="#8b93a4" fontSize={11} />
          <YAxis stroke="#8b93a4" fontSize={11} />
          <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL} />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            iconType="circle"
          />
          <Line
            type="monotone"
            dataKey="recebidas"
            stroke="#16a34a"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
            name="Recebidas"
          />
          <Line
            type="monotone"
            dataKey="enviadas"
            stroke="#f97316"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
            name="Enviadas"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export function DistribuicaoStatus({
  data,
}: {
  data: Array<{ status: string; total: number }>
}) {
  const router = useRouter()
  const filtered = data.filter((d) => d.total > 0)

  function filtrarPorStatus(status: string) {
    router.push(`/?status=${encodeURIComponent(status)}`)
    // Scroll suave até a tabela de leads
    setTimeout(() => {
      const tabela = document.querySelector('.tbl')
      if (tabela) tabela.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 150)
  }

  return (
    <div className="chart-card">
      <div className="chart-title">
        Distribuição por status
        <span style={{ fontSize: 10, color: '#8b93a4', marginLeft: 8, fontWeight: 400 }}>
          (clique para filtrar)
        </span>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={filtered}
            dataKey="total"
            nameKey="status"
            cx="50%"
            cy="50%"
            innerRadius={45}
            outerRadius={80}
            paddingAngle={2}
            onClick={(entry) => {
              const e = entry as unknown as { status?: string; payload?: { status?: string } }
              const status = e?.status ?? e?.payload?.status
              if (status) filtrarPorStatus(status)
            }}
            style={{ cursor: 'pointer' }}
          >
            {filtered.map((entry) => (
              <Cell
                key={entry.status}
                fill={STATUS_COLORS[entry.status] ?? '#94a3b8'}
                stroke="#ffffff"
                strokeWidth={2}
              />
            ))}
          </Pie>
          <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL} />
          <Legend
            wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
            iconType="circle"
            onClick={(entry) => {
              const e = entry as unknown as { value?: string }
              if (e?.value) filtrarPorStatus(e.value)
            }}
            formatter={(v) => (
              <span style={{ color: '#4a5263', cursor: 'pointer' }}>{v}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
