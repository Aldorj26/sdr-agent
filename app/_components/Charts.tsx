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
  DISPARO_REALIZADO: '#6b7280',
  INTERESSADO: '#34d399',
  FORMULARIO_ENVIADO: '#60a5fa',
  SEM_RESPOSTA: '#fbbf24',
  OPT_OUT: '#f87171',
  NAO_QUALIFICADO: '#f87171',
  AGUARDANDO: '#a78bfa',
  DESCARTADO: '#4b5563',
}

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
          <CartesianGrid strokeDasharray="3 3" stroke="#1d2028" />
          <XAxis dataKey="dia" stroke="#5b6170" fontSize={11} />
          <YAxis stroke="#5b6170" fontSize={11} />
          <Tooltip
            contentStyle={{
              background: '#0d0f14',
              border: '1px solid #2a2e3a',
              borderRadius: 8,
              fontSize: 12,
            }}
            labelStyle={{ color: '#9096a3' }}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            iconType="circle"
          />
          <Line
            type="monotone"
            dataKey="recebidas"
            stroke="#34d399"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
            name="Recebidas"
          />
          <Line
            type="monotone"
            dataKey="enviadas"
            stroke="#60a5fa"
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
        <span style={{ fontSize: 10, color: '#5b6170', marginLeft: 8, fontWeight: 400 }}>
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
                fill={STATUS_COLORS[entry.status] ?? '#6b7280'}
                stroke="#07080b"
                strokeWidth={2}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: '#0d0f14',
              border: '1px solid #2a2e3a',
              borderRadius: 8,
              fontSize: 12,
            }}
            labelStyle={{ color: '#9096a3' }}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
            iconType="circle"
            onClick={(entry) => {
              const e = entry as unknown as { value?: string }
              if (e?.value) filtrarPorStatus(e.value)
            }}
            formatter={(v) => (
              <span style={{ color: '#9096a3', cursor: 'pointer' }}>{v}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
