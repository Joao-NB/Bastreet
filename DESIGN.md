# Direção visual FUTSTREET

A edição gráfica usa ilustração editorial plana: poucos elementos, formas simples, espaço livre e composições assimétricas. Bola, linhas de quadra e trajetórias são os motivos visuais. A paleta mantém grafite `#101b1a`, verde ácido `#c7f445`, azul `#7cafff` e marfim `#f5f4e9`.

## Artes da edição gráfica

Seis imagens novas foram geradas individualmente com o ImageGen integrado, sem CLI ou chave de API. Login e início têm composições próprias. Não há cenários realistas nem atletas em 3D. Os diagramas de treino são ilustrações conceituais; as instruções, séries, pausas e objetivos continuam em texto na interface.

| Arquivo | Uso | Composição |
| --- | --- | --- |
| `assets/visuals/login.webp` | Login | Fundo grafite, espaço para títulos, bola marfim e linha azul na base |
| `assets/visuals/home.webp` | Início | Quadra gráfica inclinada sobre azul, bola lima e posições abstratas |
| `assets/visuals/controle-bola.webp` | Sola & domínio | Recorte de calçado controlando a bola e seta lateral |
| `assets/visuals/passe-parede.webp` | Passe & primeiro toque | Calçado, bola, parede e trajetórias de ida e volta |
| `assets/visuals/agilidade.webp` | Condução & mudança | Quatro cones, bola e percurso sinuoso |
| `assets/visuals/finalizacoes.webp` | Mira & finalização | Bola, trajetória e alvo no canto do gol |

Os prompts completos estão em [prompts-v3.json](assets/visuals/prompts-v3.json). Os PNGs originais foram preservados em `output/imagegen/futstreet-v3/`. Os WebP usados pela aplicação somam aproximadamente 118 KB. A conversão e redução de dimensões preservam a composição; títulos e botões permanecem em HTML acessível.

## Composição da interface

O login mantém a arte à esquerda e o formulário à direita no desktop. No celular, a bola aparece como detalhe à direita da abertura. A arte inicial é independente, com fundo azul e composição contida para preservar o desenho; no celular, aparece em uma faixa abaixo da chamada para a partida. As imagens dos treinos usam proporção 3:2, sem gradientes escuros ou animação de zoom. A textura de ruído foi retirada para dar mais clareza ao conjunto.

As URLs de CSS, JavaScript e das seis imagens incluem a versão `graphic-3`, para que navegadores que já tenham visitado o aplicativo recebam os arquivos novos. A navegação e o radar usam o ícone vetorial plano `assets/ball-flat.svg`, coerente com a edição gráfica.

## Olinda como origem

A motivação territorial vem da visita relatada pelo grupo à Vila Olímpica de Rio Doce. O GPS utiliza a localização atual do atleta, inclusive em outros estados. Cidade e UF do perfil orientam a escolha de quadra para a partida.
