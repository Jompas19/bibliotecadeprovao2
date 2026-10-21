# Instalar os Comentários OituTigas (versão 3 — somente texto)

**Hospedagem do site: GitHub Pages. Dados dos comentários: SEGUNDO projeto Supabase, sem relação com a sincronização antiga (`sync.js`).**

## Antes de começar

- Tenha o endereço EXATO de seu site (por exemplo, `https://usuario.github.io/biblioteca/`).
- No campo `OITUTIGAS_ALLOWED_ORIGINS`, use somente a *origem*, `https://usuario.github.io`, sem subpastas ou barra final.
- O comentário exige nome e texto. Os visitantes NÃO precisam criar conta ou informar senha.
- **A chave do administrador é secreta e jamais deve ser incluída em arquivos enviados ao GitHub.**

## 1 — Crie ou identifique o segundo projeto no Supabase

Acesse https://supabase.com/dashboard. Crie um projeto para comentários, separado do projeto de sincronização.

Se o novo projeto ainda não tem o recurso implantado: abra `SQL Editor` → `New query` e execute todo o conteúdo de `schema-oitutigas.sql`. Isso cria as tabelas de comentários e de controle básico contra spam, restringindo o acesso direto por RLS e permissões. **Não é necessário criar bucket no Storage.**

**Se você JÁ executou o SQL da versão anterior, que aceitava imagens:** no mesmo projeto, em vez de recriar tabelas, faça backup dos dados e execute `migracao-sem-imagens.sql`. Observe que comentários que continham apenas imagens serão excluídos pela migração. Os arquivos físicos anteriores NÃO são apagados pelo SQL: entre em `Storage`, esvazie e remova manualmente o antigo bucket `oitutigas-images` para liberar espaço.

## 2 — Configure os três secrets

No segundo projeto: `Edge Functions` → `Secrets` / `Manage secrets`. Configure:

| Nome | Valor |
|---|---|
| `OITUTIGAS_ALLOWED_ORIGINS` | Origem exata do GitHub Pages, como `https://usuario.github.io`. Se for necessário mais de um domínio, separe por vírgulas. |
| `OITUTIGAS_IP_SALT` | Texto aleatório secreto de pelo menos 32 caracteres, usado para evitar armazenar IPs em texto puro. |
| `OITUTIGAS_ADMIN_TOKEN` | **Uma segunda chave aleatória diferente, com pelo menos 32 caracteres**. Somente você deve conhecê-la. Ela autoriza a exclusão de QUALQUER comentário. |

**Não envie as três chaves para o ChatGPT nem as coloque em `comments-config.js`.** É possível gerar duas chaves aleatórias diferentes num gerenciador de senhas ou pelo terminal com `openssl rand -base64 48`. Anote a `OITUTIGAS_ADMIN_TOKEN` em local seguro. Não a reutilize como senha de outro serviço.

A Edge Function usa as credenciais de banco disponibilizadas no próprio ambiente Supabase. Não copie `service_role`, `secret key` ou senha do banco para os arquivos públicos.

## 3 — Publique a Edge Function

1. No segundo projeto, vá em `Edge Functions` → `Deploy a new function` → `Via Editor`.
2. Nome da função: **`oitutigas-comments`**.
3. Substitua todo o conteúdo do editor pelo arquivo **`COLE-NO-EDITOR-DA-FUNCAO.ts`**.
4. Clique em `Deploy function`.
5. Nas configurações da função, **desative `Verify JWT`**, pois os usuários não realizam login.
6. Copie a URL da função, que termina com `/functions/v1/oitutigas-comments`.

Alternativa para desenvolvedores: o código modular está em `supabase/functions/oitutigas-comments/` e `supabase/config.toml` contém `verify_jwt = false`.

## 4 — Configure o GitHub Pages

No arquivo **`comments-config.js`**, edite somente o endereço público da função:

```js
window.OITUTIGAS_CONFIG = {
  apiUrl: 'https://ID-DO-SEGUNDO-PROJETO.supabase.co/functions/v1/oitutigas-comments'
};
```

Envie os arquivos do site (o conteúdo da pasta `bibliotecadeprovao-main/`) para o repositório GitHub Pages como já fazia. Os arquivos `supabase/` podem ficar no repositório como código-fonte; nenhum deles contém os secrets criados no passo 2. **Não é necessário mudar a hospedagem ou reconfigurar a sincronização atual.**

## 5 — Como moderar comentários

1. Entre em uma questão respondida no site.
2. Na seção **Comentários OituTigas**, clique em `Moderação`.
3. Digite a **chave `OITUTIGAS_ADMIN_TOKEN`** cadastrada no servidor.
4. Após a validação, cada comentário exibirá `Excluir como administrador`. Você pode excluir comentários de QUALQUER usuário, sem saber os códigos individuais dos autores.
5. Para encerrar, clique em `Sair da moderação` ou recarregue a página.

A chave não fica armazenada em cookies ou `localStorage`: permanece apenas na memória da aba até sair da moderação ou recarregar. Não compartilhe sua chave. Como o site não exige autenticação, **a posse dessa chave autoriza a moderação**. Configure uma chave aleatória robusta.

O autor pode apagar o próprio comentário usando o código gerado na publicação. Sem login, o nome exibido **não comprova identidade**.

## 6 — Teste de ponta a ponta

Abra uma questão, responda, informe um nome, escreva um comentário e publique. Abra a mesma questão em outro navegador: o texto deve aparecer. Tente excluir um comentário com um código errado (deve ser negado), depois com o correto; por fim, use a moderação para excluir um comentário que não seja seu.

Se der erro 401, confirme `Verify JWT` desativado. Se aparecer erro de origem, confira `OITUTIGAS_ALLOWED_ORIGINS`. Se a moderação for negada, confira o valor exato de `OITUTIGAS_ADMIN_TOKEN` e faça o redeploy quando necessário. No painel do Supabase, `Edge Functions` → `Logs` ajuda a investigar falhas.

## Limites e responsabilidades

Há limite básico de 8 comentários por janela de uma hora por identificador de IP, mas usuários sem login ainda podem contornar parte das proteções. É possível acrescentar CAPTCHA e mecanismos extras conforme o público crescer. A Edge Function é a única que pode ler ou alterar os registros na base, e os comentários continuam visíveis a todos através dela.

Os testes incluídos em `supabase/tests/test-oitutigas.mjs` validam a lógica local; **nenhuma implantação no Supabase real foi executada por esta entrega**.

Documentação: https://supabase.com/docs/guides/functions/quickstart-dashboard · https://supabase.com/docs/guides/functions/secrets · https://supabase.com/docs/guides/functions/function-configuration
