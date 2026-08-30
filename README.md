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

Os dados são demonstrativos e ficam no navegador. A próxima etapa arquitetural recomendada é conectar autenticação e banco de dados (por exemplo, Supabase/PostgreSQL) mantendo esta interface como cliente.

## Autenticação

O login e o cadastro são funcionais como protótipo e mantêm a sessão no navegador. Ainda não armazenam usuários reais nem senhas. Para produção, conecte o formulário a um provedor seguro de autenticação, como Supabase Auth.

## Deploy

O workflow em `.github/workflows/deploy.yml` publica automaticamente o site no GitHub Pages a cada push na branch `main`.
