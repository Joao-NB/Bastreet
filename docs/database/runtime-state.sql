-- Armazenamento operacional usado pela aplicação BASTREET.
-- A aplicação cria esta tabela automaticamente ao receber DATABASE_URL.

CREATE TABLE IF NOT EXISTS bastreet_state (
  id smallint PRIMARY KEY CHECK (id = 1),
  data jsonb NOT NULL,
  revision bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE bastreet_state IS
  'Estado persistente do MVP: usuários, perfis, sessões, treinos, ranking, mensagens, filas, partidas e inscrições.';
