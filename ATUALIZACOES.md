# Atualizações — FUTSTREET

- Seis artes originais geradas: login, bola transparente da navegação e atletas dos quatro treinos. Arquivos otimizados em WebP, tipografia em HTML e composição adaptada a desktop e celular.
- Busca rápida 5 × 5 preservada. Duelo 2 × 2, Trio 3 × 3 e Quarteto 4 × 4 têm filas independentes com usuários reais. A mesma conta não duplica entrada e só fica em um formato por vez.
- Todos os formatos mantêm confirmação individual, chat privado por partida, seleção de quadra por cidade/UF e registro único de 100 XP e 50 pontos após todos confirmarem.
- A ação Ir treinar abre os treinos mantendo o heartbeat da busca. O aviso da fila permite voltar ou sair; recarregar retoma uma busca ainda válida.
- Olinda, PE é a origem do projeto e a referência sem GPS. A Vila Olímpica de Rio Doce foi acrescentada à base regional a partir da visita relatada pelo grupo.
- O mapa usa GPS também em outras regiões. A consulta procura futsal e quadras de futebol com piso duro ou cobertas, com cache e referência regional identificados na interface.
- Cadastro sem altura. Gênero com Mulher, Homem e Outro. Cidade e UF obrigatórias no cadastro e na atualização de perfil, com validação também na API.
- Contas, credenciais, mensagens, treinos concluídos, pontos e partidas anteriores continuam preservados.

## Verificação

`npm test` verifica API, filas de todos os formatos, troca de formato, duplicação, expiração, chats privados, confirmação, pontuação, treinos, cadastro, cidade/UF e arquivos de imagem usando bases descartáveis.

`node scripts/verify-interface.cjs` verifica cadastro pela interface, composição em desktop/celular, treino enquanto espera, heartbeat, retomada, partida 2 × 2 real, busca rápida padrão, GPS simulado em São Paulo e movimento reduzido.

A direção visual e os prompts completos estão em DESIGN.md e assets/visuals/prompts.json.
