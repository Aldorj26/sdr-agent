-- SDR Agent AIVA — Schema Supabase
-- Aplicar via SQL Editor em: https://supabase.com/dashboard/project/axkrorkhnkfkpbjikwrb

-- ─── Tabela principal de leads ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sdr_leads (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome                  TEXT NOT NULL,
  telefone              TEXT UNIQUE NOT NULL,
  cidade                TEXT,
  produto               TEXT NOT NULL DEFAULT 'AIVA',
  status                TEXT NOT NULL DEFAULT 'DISPARO_REALIZADO',
  etapa_cadencia        INT NOT NULL DEFAULT 1,
  evotalks_chat_id      TEXT,                            -- ID do atendimento no Evo Talks
  evotalks_client_id    TEXT,                            -- ID do cliente no Evo Talks
  data_disparo_inicial  TIMESTAMPTZ,
  data_proximo_followup TIMESTAMPTZ,
  data_ultimo_contato   TIMESTAMPTZ,
  acionar_humano        BOOLEAN NOT NULL DEFAULT false,
  observacoes           TEXT,
  criado_em             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_sdr_leads_telefone         ON sdr_leads(telefone);
CREATE INDEX IF NOT EXISTS idx_sdr_leads_status           ON sdr_leads(status);
CREATE INDEX IF NOT EXISTS idx_sdr_leads_followup         ON sdr_leads(data_proximo_followup);
CREATE INDEX IF NOT EXISTS idx_sdr_leads_evotalks_chat_id ON sdr_leads(evotalks_chat_id);

-- ─── Tabela de mensagens ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sdr_mensagens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id     UUID NOT NULL REFERENCES sdr_leads(id) ON DELETE CASCADE,
  direcao     TEXT NOT NULL CHECK (direcao IN ('in', 'out')),
  conteudo    TEXT NOT NULL,
  template_hsm TEXT,
  enviado_em  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sdr_mensagens_lead_id ON sdr_mensagens(lead_id);

-- ─── View de métricas ─────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW sdr_metricas AS
SELECT
  status,
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE data_disparo_inicial >= NOW() - INTERVAL '7 days')  AS ultimos_7_dias,
  COUNT(*) FILTER (WHERE data_disparo_inicial >= NOW() - INTERVAL '30 days') AS ultimos_30_dias
FROM sdr_leads
GROUP BY status;
