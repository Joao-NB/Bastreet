# Atualizações da aplicação BASTREET

## Partidas e matchmaking

- A fila recebe contas autenticadas e mostra os jogadores ativos em tempo real. Uma entrada expira após 30 segundos sem resposta.
- Seis jogadores formam dois times de três por ordem de entrada, sem pontuação ou análise de perfil para separar os times.
- A quadra considera a cidade salva no perfil. Prioriza a cidade com maioria no grupo e busca uma opção intermediária quando as cidades ficam divididas.
- A partida oferece confirmação individual, detalhes dos times, rota para o Google Maps e conversa privada restrita aos seis participantes.
- Depois que os seis confirmam presença, cada participante pode registrar que jogou. O registro único concede 100 XP e 50 pontos semestrais.

## Cadastro, perfil e ranking

- Novas contas persistem no banco configurado por `DATABASE_URL` e começam no nível 0, com XP, pontos, partidas e treinos zerados.
- O perfil mostra estatísticas reais e permite atualizar a cidade usada na busca de quadras.
- O ranking não inclui contas que ainda não acumularam pontos.

## Treinos

- Os exercícios exibem ilustrações animadas e instruções específicas.
- Ao iniciar, um cronômetro fica dentro do card do exercício. O servidor só aceita a conclusão após o tempo configurado.
- Três treinos concluídos na semana liberam a dificuldade Intermediária; cinco liberam a Avançada.
- O ranking de treinos mostra resultados reais separados por dificuldade.

## Chat e segurança

- O chat tem uma sala global e salas privadas para as partidas do usuário, com estilos visuais diferentes.
- Conversas de partida só podem ser lidas e escritas pelos participantes.
- As rotas de partida e ranking não enviam e-mail ou outros dados pessoais desnecessários.
- O servidor publica apenas os arquivos da aplicação e do Leaflet; arquivos de ambiente e estado local não ficam acessíveis como arquivos estáticos.

## Validação

- A API foi verificada localmente com seis contas: fila, formação 3 × 3, seleção regional, confirmação, chat privado e registro de pontos sem duplicação.
- Também foram verificadas a proteção de início/conclusão dos treinos, a persistência de cidade e as sintaxes de JavaScript.
- A conexão de produção deve usar o projeto Supabase reativado pela variável secreta `DATABASE_URL`.
