'use client'

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'

export default function TokenChart({
  data,
}: {
  data: Array<{ dia: string; custo: number }>
}) {
  return (
    <div className="chart-card">
      <div className="chart-title">Custo por dia — últimos 30 dias (USD)</div>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e3e6ec" vertical={false} />
          <XAxis dataKey="dia" stroke="#8b93a4" fontSize={11} />
          <YAxis
            stroke="#8b93a4"
            fontSize={11}
            tickFormatter={(v) => `$${Number(v).toFixed(2)}`}
          />
          <Tooltip
            contentStyle={{
              background: '#ffffff',
              border: '1px solid #e3e6ec',
              borderRadius: 8,
              fontSize: 12,
              boxShadow: '0 4px 12px rgba(16,24,40,0.08)',
            }}
            labelStyle={{ color: '#1c2230', fontWeight: 600 }}
            formatter={(v) => [`$${Number(v).toFixed(4)}`, 'Custo']}
          />
          <Bar dataKey="custo" fill="#f97316" radius={[4, 4, 0, 0]} name="Custo" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
