# FUTSTREET no Render

A aplicação está publicada em [futstreet.onrender.com](https://futstreet.onrender.com/). O código de produção vem da branch `main` do repositório `Joao-NB/Bastreet`, com deploy automático por commit.

O arquivo `render.yaml` especifica Node, `npm ci`, `npm start`, plano Free, região Ohio e `/api/health` como rota de verificação. O banco PostgreSQL de produção é configurado por `DATABASE_URL` no painel do Render; `DATABASE_SSL=true`. Não adicione credenciais ao repositório.

A rota [`/api/health`](https://futstreet.onrender.com/api/health) permite conferir se o serviço está ativo e informa o tipo de banco usado. As artes do login, do início e dos treinos são servidas em `/assets/visuals/`.
