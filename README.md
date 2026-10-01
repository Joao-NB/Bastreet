# BASTREET

Aplicação responsiva de partidas 3 × 3 de basquete, criada para o projeto de extensão da UNINASSAU.

## Executar

1. Abra esta pasta no VS Code.
2. No terminal, execute `npm ci`.
3. Execute `npm run dev`.
4. Acesse `http://localhost:4173`.

O frontend usa HTML, CSS, JavaScript e Leaflet. A API usa Node.js e o driver `pg` para PostgreSQL.

## Fluxos disponíveis

- Entre na fila com uma conta própria. O servidor forma dois times de três quando há seis jogadores ativos.
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

O login e o cadastro usam uma API real, hash de senha com `scrypt` e tokens de sessão. O cadastro armazena nome, idade, altura, cidade, posição, gênero e dias disponíveis. Novas contas começam no nível 0, sem pontos, partidas ou treinos. Expiração de sessões e recuperação de senha permanecem como evoluções posteriores.

## Regras de progressão do MVP

- **Partidas:** seis contas distintas na fila ativa; times 3 × 3 na ordem de entrada, sem análise de habilidade. A fila expira quando um participante deixa de responder por 30 segundos.
- **Participação:** cada jogador confirma a presença. Quando os seis confirmam, o botão para registrar o jogo concluído concede 100 XP e 50 pontos uma única vez por jogador.
- **Treinos:** o servidor exige o tempo completo do exercício antes de conceder XP e pontos. Três treinos na semana liberam Intermediário; cinco liberam Avançado. A meta reinicia na segunda-feira em UTC.
- **Ranking de treinos:** mostra conclusões reais separadas por dificuldade.
- **Pontos semestrais:** acumulam com treinos e aparecem no ranking de jogadores.

As quadras usam uma base regional pré-carregada para Recife e Olinda, complementada por resultados reais da API Overpass/OpenStreetMap. A aba abre primeiro com essa visão local, sem esperar o serviço externo. Assim que o GPS responde, o servidor pesquisa automaticamente ao redor das coordenadas recebidas e a interface incorpora o resultado em segundo plano. Sem permissão, Torre/Recife é usada como referência. A busca começa em 8 km e aumenta automaticamente para 25 km quando há poucos resultados. A contingência de Olinda inclui referências em Rio Doce, Bultrins e Ouro Preto; a existência de estrutura para basquete na [Vila Olímpica](https://www.olinda.pe.gov.br/noticias/vila-olimpica-de-rio-doce-cadastra-interessados-em-praticar-esportes) e na [Quadra Milton Pina](https://www.olinda.pe.gov.br/moradores-dos-bultrins-terao-nova-opcao-de-lazer-com-quadra-poliesportiva-renovada/) é documentada pela Prefeitura de Olinda. O botão **Como chegar** abre a rota no Google Maps sem exigir chave de API.

## Demonstração com o grupo

Para testar uma partida, abra a aplicação em seis navegadores ou celulares, cadastre seis contas diferentes e toque em **Buscar partida** em cada uma. As quatro contas do script `npm run demo:prepare` não bastam para fechar uma partida.

## Deploy

O frontend e a API Node.js são publicados juntos no Render. O banco deve ser um PostgreSQL gerenciado externo, como Supabase ou Neon, conectado pela variável secreta `DATABASE_URL`.

No Render, configure `DATABASE_URL` com a connection string do provedor e mantenha `DATABASE_SSL=true`. A aplicação cria a estrutura operacional automaticamente e a rota `/api/health` informa `database: postgresql` e `persistent: true`. A credencial nunca deve ser adicionada ao GitHub. Se o projeto Supabase estiver pausado, é preciso reativá-lo no [painel do Supabase](https://supabase.com/dashboard) para a aplicação conectar ao banco. No plano gratuito, [baixa atividade pode causar novas pausas](https://supabase.com/docs/guides/platform/free-project-pausing).
