# Diagrama entidade-relacionamento — BASTREET

O diagrama representa o modelo PostgreSQL de referência definido em [`schema.sql`](./schema.sql). Ele é documentação evolutiva e não altera o armazenamento utilizado pela aplicação atual.

```mermaid
erDiagram
  USERS ||--|| PLAYER_PROFILES : possui
  USERS ||--o{ PLAYER_AVAILABILITY : informa
  USERS ||--o{ TRAINING_SESSIONS : realiza
  TRAINING_CATALOG ||--o{ TRAINING_SESSIONS : classifica
  COURTS ||--o{ TRAINING_SESSIONS : recebe
  USERS ||--o{ EVENTS : organiza
  COURTS ||--o{ EVENTS : sedia
  EVENTS ||--o{ EVENT_PARTICIPANTS : agrega
  USERS ||--o{ EVENT_PARTICIPANTS : participa
  USERS ||--o{ COURT_CHECKINS : registra
  COURTS ||--o{ COURT_CHECKINS : recebe
  EVENTS o|--o{ COURT_CHECKINS : valida
  USERS ||--o| MATCHMAKING_QUEUE : entra
  COURTS o|--o{ MATCHMAKING_QUEUE : prefere
  EVENTS o|--o| MATCHES : origina
  MATCHES ||--o{ MATCH_PLAYERS : escala
  USERS ||--o{ MATCH_PLAYERS : joga
  ACADEMIC_SEMESTERS ||--o{ RANKING_ENTRIES : consolida
  USERS ||--o{ RANKING_ENTRIES : pontua
  EVENTS o|--o{ CONVERSATIONS : contextualiza
  CONVERSATIONS ||--o{ CONVERSATION_MEMBERS : possui
  USERS ||--o{ CONVERSATION_MEMBERS : integra
  CONVERSATIONS ||--o{ MESSAGES : contém
  USERS o|--o{ MESSAGES : envia
```

## Decisões estruturais

- A classificação técnica usada no balanceamento (`skill_rating`) é independente do ranking semestral.
- Disponibilidades, participantes, jogadores das partidas e membros de conversa são relações próprias, evitando listas embutidas.
- Treinos coletivos apontam para uma quadra e podem receber mais pontos de ranking sem misturar a regra com o histórico.
- Quadras aceitam dados de fontes externas, como OpenStreetMap, sem duplicação pelo par `external_source` e `external_id`.
- O esquema contém restrições e índices para integridade e desempenho, mas não armazena senhas em texto puro.
