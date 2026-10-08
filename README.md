# FUTSTREET

Aplicação de futsal, treinos e comunidade criada para o projeto de extensão da UNINASSAU em Olinda, PE. A visita do grupo à Vila Olímpica de Rio Doce motivou a escolha do futsal, em sintonia com o espaço, as escolinhas e os grupos de jogadores locais.

## Executar

1. Abra esta pasta no VS Code.
2. No terminal, execute `npm ci`.
3. Execute `npm run dev`.
4. Acesse `http://localhost:4173`.

Execute `npm test` para verificar API, progressão e todos os formatos de jogo em bases descartáveis. `node scripts/verify-interface.cjs` verifica a interface em Chrome no Windows; usa contas descartáveis e simula GPS em outro estado.

O frontend usa HTML, CSS, JavaScript e Leaflet. A API usa Node.js e o driver `pg` para PostgreSQL.

## Fluxos disponíveis

- A busca rápida sempre usa 5 × 5. Os cards Duelo, Trio, Quarteto e Clássico iniciam filas 2 × 2, 3 × 3, 4 × 4 e 5 × 5, com quatro, seis, oito ou dez pessoas reais.
- Cada formato tem uma fila separada. Uma conta só fica em uma fila por vez; trocar o formato remove a entrada anterior.
- Toque em **Ir treinar** durante a busca: o treino abre e a fila continua enviando heartbeat. O aviso em Treinos permite voltar à busca ou sair. Atualizar a página retoma a fila ainda ativa.
- Veja quem entrou na fila, confirme presença, consulte a quadra, abra a rota no Maps e converse no chat privado da partida.
- A quadra considera as cidades do perfil: prioriza a cidade da maioria ou a região intermediária quando o grupo se divide.
- Consulte partidas, ranking e perfil do jogador. A cidade do perfil pode ser atualizada.
- Navegue em layout responsivo para celular e desktop.
- Autorize a localização do navegador e descubra quadras próximas.
- Visualize resultados reais do OpenStreetMap em um mapa Leaflet interativo.
- Conclua treinos com cronômetros reais, ganhe XP e libere dificuldades maiores pelas metas semanais.
- Converse no chat global ou nos chats privados das partidas das quais você participa.

Em produção, a variável `DATABASE_URL` ativa o PostgreSQL e torna persistentes usuários, perfis esportivos, nível, XP, ranking, sessões, treinos, mensagens, filas e partidas. A tabela operacional `bastreet_state` é criada automaticamente. Sem `DATABASE_URL`, o servidor usa `data/db.json` apenas para desenvolvimento local.

## Autenticação

O login e o cadastro usam uma API real, hash de senha com `scrypt` e tokens de sessão. O cadastro armazena nome, idade, cidade com UF, posição, gênero e dias disponíveis. Cidade e estado são obrigatórios em campos separados; a API também valida o formato e as 27 UFs. As opções de gênero são Mulher, Homem e Outro. Altura foi removida do cadastro e da apresentação do perfil; contas anteriores continuam preservadas. Novas contas começam no nível 0, sem pontos, partidas ou treinos. Expiração de sessões e recuperação de senha permanecem como evoluções posteriores.

## Regras de progressão do MVP

- **Partidas:** cada formato reúne o número exato de contas distintas e divide os times pela ordem de entrada. Não há atletas simulados nem análise de habilidade para a separação. A fila expira após 30 segundos sem heartbeat.
- **Participação:** cada jogador confirma a presença. Quando todos os participantes do formato confirmam, o botão para registrar o jogo concluído concede 100 XP e 50 pontos uma única vez por jogador.
- **Treinos:** o servidor exige o tempo completo do exercício antes de conceder XP e pontos. Três treinos na semana liberam Intermediário; cinco liberam Avançado. A meta reinicia na segunda-feira em UTC.
- **Ranking de treinos:** mostra conclusões reais separadas por dificuldade.
- **Pontos semestrais:** acumulam com treinos e aparecem no ranking de jogadores.

As quadras são obtidas por OpenStreetMap usando tags de futsal e quadras de futebol com piso duro ou cobertas; campos de grama não são incluídos pela consulta. Olinda, PE é a referência inicial quando o GPS não está disponível. A base regional contém a Vila Olímpica de Rio Doce, visitada pelo grupo, e a Quadra Poliesportiva Milton Pina, cuja estrutura com balizas foi documentada pela [Prefeitura de Olinda](https://www.olinda.pe.gov.br/moradores-dos-bultrins-terao-nova-opcao-de-lazer-com-quadra-poliesportiva-renovada/). Horários, acesso e adequação do piso devem ser combinados com o grupo. Quadras exclusivas da modalidade anterior foram removidas, e caches antigos são ignorados. A busca usa a posição atual do GPS também fora de Olinda e Pernambuco, começa em 8 km e pode ampliar para 25 km. O acompanhamento atualiza a busca após deslocamentos de 350 m, respeitando um intervalo mínimo de 15 segundos. O botão de atualização permite solicitar novos dados. O cache de quadras dura até 24 horas; se a fonte externa falhar, a tela identifica a referência regional ou cache. GPS ao vivo não significa disponibilidade de quadra em tempo real. O botão **Como chegar** abre o Maps.

## Demonstração com o grupo

Para testar uma partida, abra a aplicação em dez navegadores ou celulares, cadastre dez contas diferentes e toque em **Buscar partida** em cada uma. O script `npm run demo:prepare` gera dez contas para um ambiente local de demonstração; ele substitui os dados locais e deve ser usado somente em uma base descartável.

## Deploy

O frontend e a API Node.js são publicados juntos no Render. O banco deve ser um PostgreSQL gerenciado externo, como Supabase ou Neon, conectado pela variável secreta `DATABASE_URL`.

No Render, configure `DATABASE_URL` com a connection string do provedor e mantenha `DATABASE_SSL=true`. A aplicação cria a estrutura operacional automaticamente e a rota `/api/health` informa `database: postgresql` e `persistent: true`. A credencial nunca deve ser adicionada ao GitHub. Se o projeto Supabase estiver pausado, é preciso reativá-lo no [painel do Supabase](https://supabase.com/dashboard) para a aplicação conectar ao banco. No plano gratuito, [baixa atividade pode causar novas pausas](https://supabase.com/docs/guides/platform/free-project-pausing).

## Identidade e treinos FUTSTREET

Verde ácido, azul e grafite, monograma FS e linhas de quadra. Logo em `assets/logo.svg`, favicon em `assets/favicon.svg` e imagem social de 1200 × 630 em `assets/og-futstreet.png`.

Os quatro blocos de futsal duram 8, 10, 14 e 12,5 minutos. Cada um traz aquecimento, séries com pausas, volta à calma, equipamento, instruções e um objetivo observável. A tela acompanha cada fase e respeita a preferência de redução de movimento. O plano semanal sugere três dias de prática intercalados. A contagem de XP e o desbloqueio semanal foram preservados.

Contas, credenciais, mensagens e registros existentes não são substituídos. As sessões do navegador migram para o prefixo `futstreet-`. O identificador interno `bastreet_state` permanece para continuar lendo o banco existente. Posições antigas têm equivalência na apresentação; partidas históricas mantêm seu número de jogadores. Inícios de treino da rotina anterior precisam ser reiniciados, sem afetar conclusões e pontos já salvos.

## Artes e direção visual

Seis novas ilustrações editoriais foram geradas com o ImageGen integrado: login, início e quatro treinos. O desenho usa grafite, azul, verde ácido e marfim, com linhas de quadra, pontilhado discreto e bolas sem gomos pentagonais. Os WebP ficam em `assets/visuals/` e somam cerca de 500 KB. A direção e os prompts completos estão em [DESIGN.md](DESIGN.md) e [assets/visuals/prompts-v4.json](assets/visuals/prompts-v4.json).

O serviço está publicado em [futstreet.onrender.com](https://futstreet.onrender.com/). O `render.yaml` define o nome `futstreet` e a branch `main` publica novas versões automaticamente; consulte [a configuração do deploy](docs/RENDER_FUTSTREET.md).
