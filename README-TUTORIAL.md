# Visita guiada — Biblioteca de Provões

## Primeira visita

Ao abrir o site pela primeira vez neste navegador, o estudante escolhe entre **Ver funcionalidades do site** e **Começar a usar**. Após qualquer escolha, a introdução não aparece novamente nesse navegador. O marcador é salvo no `localStorage` do domínio do site (com alternativa por sessão quando possível), separado dos dados de estudo e de sincronização.

## Acesso posterior

O botão **?**, situado imediatamente à direita de **Restaurar**, reabre o guia quando o usuário desejar. O tutorial pode ser encerrado a qualquer momento por **×** ou **Esc**. As etapas também aceitam as setas esquerda/direita do teclado.

## Percurso de 11 etapas

1. Modo claro / escuro.
2. Restaurar.
3. Sincronizar.
4. Marca-texto (com exemplo de destaque).
5. Riscar uma alternativa com × (com exemplo).
6. Classificação da questão.
7. Ocultar ou mostrar os comentários explicativos da questão.
8. Responder novamente.
9. Mudar gabarito.
10. Ver anotações (com exemplo).
11. Comentários OituTigas (com exemplo).

O guia mostra primeiro a biblioteca e depois uma **questão demonstrativa temporária** já corrigida. Essa questão não faz parte das 17 provas, não registra progresso, não altera os gabaritos, não salva anotações, não publica comentários e não faz chamadas de publicação ao Supabase. Após finalizar ou fechar, o site retorna à tela anterior do estudante.

## Publicação

Publique todos os arquivos do ZIP na raiz do repositório GitHub Pages, incluindo `tutorial.js` e `app.html` atualizados. O projeto continua com as 17 provas e 987 questões existentes; não há necessidade de atualizar o Supabase apenas para ativar este tutorial.
