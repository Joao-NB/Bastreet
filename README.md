# BASTREET

MVP responsivo de matchmaking de basquete por Elo, criado para o projeto de extensão da UNINASSAU.

## Executar

1. Abra esta pasta no VS Code.
2. No terminal, execute `npm run dev`.
3. Acesse `http://localhost:4173`.

Não é necessário instalar dependências. O protótipo usa HTML, CSS e JavaScript nativos.

## Fluxos disponíveis

- Escolha entre partida normal, rápida e personalizada.
- Simule a busca de uma partida e confirme presença.
- Consulte partidas, ranking regional e perfil do jogador.
- Navegue em layout responsivo para celular e desktop.
- Autorize a localização do navegador e descubra quadras próximas.
- Simule a formação de times usando nível técnico, altura, gênero e disponibilidade.
- Conclua treinos individuais, acumule XP e mantenha uma sequência semanal.
- Converse em um chat demonstrativo com respostas automáticas.

Os dados agora são gravados pelo servidor local em `data/db.json`. Esse arquivo é ignorado pelo Git e criado automaticamente.

## Autenticação

O login e o cadastro usam uma API real, hash de senha com `scrypt` e tokens de sessão. A implementação é adequada para uma demonstração acadêmica em rede local; produção ainda exige HTTPS, banco gerenciado, expiração de sessões e recuperação de senha.

## Regras de progressão do MVP

- **Nível técnico:** ajuda a formar partidas equilibradas e evolui com treinos.
- **XP:** progressão pessoal obtida em treinos diários e semanais.
- **Pontos semestrais:** definem o ranking usado nos campeonatos do fim do semestre.
- **Treino coletivo:** concede o dobro de pontos semestrais para valorizar participação comunitária.

As quadras e perfis são dados demonstrativos. A localização real é solicitada pelo navegador, mas um produto em produção deve consultar uma base geográfica, como OpenStreetMap/Overpass ou Google Places, e calcular distâncias no backend.

## Demonstração com o grupo

Execute `npm run demo:prepare` para restaurar as quatro contas da equipe e consulte `DEMONSTRACAO.md` para o roteiro completo. Depois, execute `npm run dev` e compartilhe com os celulares o endereço de rede exibido no terminal.

## Deploy

GitHub Pages não executa o backend Node.js e, portanto, não é mais adequado para esta versão. Um deploy público deve hospedar o servidor em Render, Railway ou Fly.io e substituir o arquivo JSON por PostgreSQL/Supabase. Para a apresentação presencial, a execução em rede local reduz dependência da internet e demonstra comunicação real entre dispositivos.
