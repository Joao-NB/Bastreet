# Roteiro de demonstração — BASTREET

## Preparação

Todos devem estar na mesma rede Wi-Fi. No computador que executará o servidor:

```bash
npm run demo:prepare
npm run dev
```

O terminal exibirá o endereço de rede, semelhante a `http://192.168.1.3:4173`. Abra esse endereço nos quatro celulares. Se o Windows solicitar permissão de firewall, permita em redes privadas.

## Contas da equipe

Senha para todas: `quadra123`

- `ruan@bastreet.demo`
- `joao@bastreet.demo`
- `daniel@bastreet.demo`
- `barbara@bastreet.demo`

## Apresentação sugerida

1. Cada integrante entra em uma conta diferente.
2. Uma pessoa registra presença em uma quadra; outra atualiza a lista e mostra a presença real.
3. Duas pessoas enviam mensagens e mostram que o chat sincroniza em até três segundos.
4. Uma pessoa conclui um treino, comprovando a atualização persistente de XP e pontos semestrais.
5. As quatro contas apertam **Buscar partida**. A quarta entrada forma automaticamente dois times de 2×2 e o resultado aparece nos quatro dispositivos.
6. Abra o ranking para mostrar que os pontos vêm de ações registradas, não de valores fixos da interface.

## O que é real neste protótipo

- Cadastro, login, hash de senha e sessão.
- Persistência local dos usuários e atividades.
- Chat compartilhado entre dispositivos.
- Check-in temporário em quadras.
- Registro diário de treinos sem duplicidade.
- XP, nível técnico e pontos semestrais.
- Fila de matchmaking e balanceamento de times.
- Distância das quadras calculada a partir das coordenadas disponíveis.

## Limitações assumidas

- O servidor precisa permanecer ligado durante a apresentação.
- Os dados ficam no computador da equipe, não em uma nuvem.
- A base de quadras é curada e contém três locais de demonstração.
- Geolocalização em celulares pode ser bloqueada em HTTP; nesse caso, o aplicativo usa Fortaleza como referência.
- O modo de banca usa quatro jogadores e partidas 2×2. O produto final pode elevar o mínimo para dez jogadores.
- O bot simples é apenas um apoio de UX. O chat entre as contas da equipe é real.

Essas limitações devem ser apresentadas como decisões de escopo do MVP, não como funcionalidades prontas para produção.
