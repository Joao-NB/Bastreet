# Direção visual FUTSTREET

Esta edição adota uma linguagem de gravura editorial esportiva: recortes em duas dimensões, linhas técnicas de quadra, pontilhado contido e cor chapada. A bola é representada por um círculo com curvas de largura uniforme, sem gomos pentagonais. A paleta usa grafite `#101b1a`, verde ácido `#c7f445`, azul `#7cafff` e marfim `#f5f4e9`.

## Artes

Seis imagens novas foram geradas individualmente com o ImageGen integrado. Os arquivos WebP ficam em `assets/visuals/`; os prompts finais estão em [prompts-v4.json](assets/visuals/prompts-v4.json). Os PNGs originais estão em `output/imagegen/futstreet-v4/` nesta cópia local.

| Arquivo | Uso | Ideia visual |
| --- | --- | --- |
| `login.webp` | Login | Recorte de bola lima e arco azul somente à direita do painel |
| `home.webp` | Início | Quadra azul inclinada e percurso sobre base grafite |
| `controle-bola.webp` | Sola & domínio | Calçado sobre bola, seta lateral e recorte de quadra |
| `passe-parede.webp` | Passe & primeiro toque | Passe de ida e volta entre calçado e parede |
| `agilidade.webp` | Condução & mudança | Quatro cones e percurso sinuoso |
| `finalizacoes.webp` | Mira & finalização | Trajetória até um alvo no gol |

O ícone da navegação em `assets/ball-flat.svg` acompanha os traços curvos regulares da bola. Os títulos, instruções e controles permanecem em HTML acessível.

## Legibilidade e composição

A arte do login fica confinada à lateral direita. A área esquerda do painel é grafite, mantendo contraste para os títulos, o parágrafo e os dados de apoio também em janelas baixas. No celular, a bola aparece à direita do texto. A arte inicial usa uma composição independente. Cada treino tem uma representação própria do movimento, em formato horizontal.

A versão `editorial-4` nas URLs de CSS, JavaScript e imagens evita que o navegador apresente a edição anterior em cache. As imagens WebP totalizam aproximadamente 500 KB. O movimento das imagens dos treinos permanece desativado e a interface respeita a preferência por movimento reduzido.
