# Nome Futstreet no Render

O `render.yaml` deste projeto define o serviço como `futstreet`. Essa edição local, por si só, não altera um serviço já publicado nem garante a disponibilidade de `https://futstreet.onrender.com`.

1. No [painel do Render](https://dashboard.render.com/), abra o serviço existente `bastreet` e suas configurações.
2. Altere o nome para `futstreet` e confira a URL que o Render atribuir ao serviço. O subdomínio depende da disponibilidade do nome; confirme que é exatamente `https://futstreet.onrender.com`.
3. Se o serviço estiver vinculado a um Blueprint, sincronize o nome do serviço existente com o `render.yaml` atualizado antes de aplicar o Blueprint. Confira o plano de alterações para evitar a criação acidental de outro serviço.
4. Publique o código atualizado no repositório conectado e acompanhe o deploy. Verifique `/api/health`, login, início, treinos e imagens na URL efetivamente atribuída.

Preserve as variáveis de ambiente e a conexão atual com o PostgreSQL. O nome interno da tabela `bastreet_state` permanece para manter os dados existentes.

Também é possível renomear o serviço autenticado pela [CLI oficial do Render](https://render.com/docs/cli-reference):

```powershell
render services update <ID_DO_SERVICO_EXISTENTE> --name futstreet --output json
```

A [documentação de Web Services](https://render.com/docs/web-services) explica a relação entre o nome e o subdomínio. Esta sessão não dispõe de credencial do Render; a renomeação pública ainda precisa ser executada e verificada no serviço.
