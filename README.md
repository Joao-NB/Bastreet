# BASTREET

MVP responsivo de matchmaking de basquete por Elo, criado para o projeto de extensão da UNINASSAU.

## Executar

1. Abra esta pasta no VS Code.
2. No terminal, execute `npm ci`.
3. Execute `npm run dev`.
4. Acesse `http://localhost:4173`.

O frontend usa HTML, CSS, JavaScript e Leaflet. A API usa Node.js e o driver `pg` para PostgreSQL.

## Fluxos disponíveis

- Escolha entre partida normal, rápida e personalizada.
- Simule a busca de uma partida e confirme presença.
- Consulte partidas, ranking regional e perfil do jogador.
- Navegue em layout responsivo para celular e desktop.
- Autorize a localização do navegador e descubra quadras próximas.
- Visualize resultados reais do OpenStreetMap em um mapa Leaflet interativo.
- Simule a formação de times usando nível técnico, altura, gênero e disponibilidade.
- Conclua treinos individuais, acumule XP e mantenha uma sequência semanal.
- Converse em um chat demonstrativo com respostas automáticas.

Em produção, a variável `DATABASE_URL` ativa o PostgreSQL e torna persistentes usuários, perfis esportivos, disponibilidade, nível declarado, nível técnico, XP, ranking, sessões, treinos, mensagens, filas e partidas. A tabela operacional `bastreet_state` é criada automaticamente. Sem `DATABASE_URL`, o servidor usa `data/db.json` apenas para desenvolvimento local.

## Autenticação

O login e o cadastro usam uma API real, hash de senha com `scrypt` e tokens de sessão. O cadastro armazena nome, idade, altura, localização, posição, gênero, nível declarado e dias disponíveis. O perfil passa a exibir os dados da conta autenticada. Expiração de sessões e recuperação de senha permanecem como evoluções posteriores.

## Regras de progressão do MVP

- **Nível técnico:** ajuda a formar partidas equilibradas e evolui com treinos.
- **XP:** progressão pessoal obtida em treinos diários e semanais.
- **Pontos semestrais:** definem o ranking usado nos campeonatos do fim do semestre.
- **Treino coletivo:** concede o dobro de pontos semestrais para valorizar participação comunitária.

As quadras usam uma base regional pré-carregada para Recife e Olinda, complementada por resultados reais da API Overpass/OpenStreetMap. A aba abre primeiro com essa visão local, sem esperar o serviço externo. Assim que o GPS responde, o servidor pesquisa automaticamente ao redor das coordenadas recebidas e a interface incorpora o resultado em segundo plano. Sem permissão, Torre/Recife é usada como referência. A busca começa em 8 km e aumenta automaticamente para 25 km quando há poucos resultados. A contingência de Olinda inclui referências em Rio Doce, Bultrins e Ouro Preto; a existência de estrutura para basquete na [Vila Olímpica](https://www.olinda.pe.gov.br/noticias/vila-olimpica-de-rio-doce-cadastra-interessados-em-praticar-esportes) e na [Quadra Milton Pina](https://www.olinda.pe.gov.br/moradores-dos-bultrins-terao-nova-opcao-de-lazer-com-quadra-poliesportiva-renovada/) é documentada pela Prefeitura de Olinda. O botão **Como chegar** abre a rota no Google Maps sem exigir chave de API.

## Demonstração com o grupo

Execute `npm run demo:prepare` para restaurar as quatro contas da equipe e consulte `DEMONSTRACAO.md` para o roteiro completo. Depois, execute `npm run dev` e compartilhe com os celulares o endereço de rede exibido no terminal.

## Deploy

O frontend e a API Node.js são publicados juntos no Render. O banco deve ser um PostgreSQL gerenciado externo, como Supabase ou Neon, conectado pela variável secreta `DATABASE_URL`.

No Render, configure `DATABASE_URL` com a connection string do provedor e mantenha `DATABASE_SSL=true`. A aplicação cria a estrutura operacional automaticamente e a rota `/api/health` informa `database: postgresql` e `persistent: true`. A credencial nunca deve ser adicionada ao GitHub.
