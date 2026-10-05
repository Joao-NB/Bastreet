# Direção visual FUTSTREET

A identidade combina cultura de quadra em Olinda, recortes editoriais e o acabamento de interfaces esportivas de jogos contemporâneos. As imagens são autorais: não reproduzem personagens, marcas, uniformes ou interfaces de jogos existentes.

## Artes geradas

Foi usado o ImageGen integrado, sem CLI ou chave de API. As imagens foram revisadas para composição, proporção, pés em contato com a bola, exercício demonstrado e consistência da paleta. O ícone preserva transparência real. WebP reduz o peso das seis imagens de aproximadamente 12 MB para cerca de 600 KB, sem mudar o conteúdo da arte.

| Arquivo | Uso | Composição |
| --- | --- | --- |
| `assets/visuals/login.webp` | Login e destaque inicial | Quadra escultórica em perspectiva, bola em primeiro plano e espaço escuro para tipografia |
| `assets/visuals/ball.webp` | Busca rápida na navegação e radar | Bola isolada com material tátil, detalhes em lima e azul e fundo transparente |
| `assets/visuals/controle-bola.webp` | Sola & domínio | Pé de apoio plantado e sola controlando a bola |
| `assets/visuals/passe-parede.webp` | Passe & primeiro toque | Passe rasteiro com trajetória de ida e volta na parede |
| `assets/visuals/agilidade.webp` | Condução & mudança | Bola perto do pé, percurso entre quatro cones |
| `assets/visuals/finalizacoes.webp` | Mira & finalização | Pé de apoio, chute de peito do pé e trajetória para o canto do gol |

Os prompts finais completos, enviados individualmente para cada imagem, estão em [prompts.json](assets/visuals/prompts.json). Paleta: verde ácido `#c7f445`, grafite `#101b1a`, azul `#7cafff` e marfim. Não há texto embutido nas imagens: títulos, estados e botões continuam como HTML acessível.

## Composição da interface

No desktop, o login mantém a imagem à esquerda e os formulários à direita. Uma camada escura protege a leitura dos títulos. No celular, a imagem vira uma abertura mais compacta, com o formulário abaixo. O botão central da navegação usa a bola transparente sem alterar sua área de toque.

Os modos usam placares grandes, nome curto, número de atletas e contagem real da fila. A busca rápida mantém 5 × 5. Duelo, Trio e Quarteto usam as mesmas regras de usuários, chats, confirmação e progressão. A ação Ir treinar mantém a fila ativa, com um aviso discreto para voltar ou sair.

As ilustrações dos treinos representam a ação principal. A ficha mantém séries, tempo, pausas, fases e instruções práticas. O movimento é discreto e desativado quando o dispositivo prefere movimento reduzido.

## Olinda como origem

A motivação territorial vem da visita relatada pelo grupo à Vila Olímpica de Rio Doce. Ela aparece como referência do projeto; horários e acesso precisam ser confirmados com a administração local. O GPS utiliza a localização atual do atleta, inclusive em outros estados. O município e a UF do perfil orientam a escolha de quadra para a partida e evitam ambiguidade entre cidades de mesmo nome.
