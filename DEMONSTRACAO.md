# Demonstração — FUTSTREET

Execute `npm run dev` e abra `http://localhost:4173`. Use contas distintas em navegadores, perfis ou celulares diferentes. Duelo 2 × 2 precisa de quatro jogadores; Trio 3 × 3, de seis; Quarteto 4 × 4, de oito; e Clássico 5 × 5, de dez. A busca rápida da navegação sempre usa 5 × 5. Os times seguem a ordem de entrada.

O script `npm run demo:prepare` prepara dez atletas apenas para uma base local descartável e substitui `data/db.json`. As contas são `ruan@futstreet.demo`, `joao@futstreet.demo`, `daniel@futstreet.demo`, `barbara@futstreet.demo` e `atleta5@futstreet.demo` até `atleta10@futstreet.demo`. Senha de demonstração: `quadra123`. Contas reais existentes continuam usando suas credenciais originais.

1. Cadastre uma conta com cidade e estado; mostre a identidade, as novas imagens e as posições de futsal no perfil.
2. Abra Treinos: mostre os quatro exercícios ilustrados e o plano semanal.
3. Inicie Sola & domínio. Mostre aquecimento, cronômetro e progresso. A conclusão só funciona após os oito minutos; atualizar a página retoma a sessão.
4. Abra Quadras: mostre Olinda como origem, a referência da Vila Olímpica de Rio Doce, busca por quadras de futsal e rotas no Maps. Autorize o GPS para buscar na posição atual, também fora de Pernambuco.
5. Escolha 2 × 2 em quatro contas ou 5 × 5 em dez. Mostre as filas separadas. Toque em Ir treinar e acompanhe o aviso da busca sem interromper o treino.
6. Quando a partida se formar, confirme cada presença e abra o chat privado. Mostre que uma conta externa não participa dele.
7. Depois do jogo e da confirmação de todos os participantes, registre a conclusão: 100 XP e 50 pontos, sem duplicação.
8. Mostre ranking e chat da comunidade.

Sem `DATABASE_URL`, os dados ficam no JSON local. Com a variável configurada, o servidor usa PostgreSQL. A localização precisa de HTTPS ou localhost; cobertura e atualização do mapa dependem do OpenStreetMap. Combine acesso e horário da quadra no chat.
