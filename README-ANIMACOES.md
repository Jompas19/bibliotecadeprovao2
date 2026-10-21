# Biblioteca de Provões — Animações discretas

Esta atualização acrescenta apenas transições visuais à versão com 17 provas e tutorial interativo.

## Efeitos adicionados

- **Biblioteca:** entrada suave dos cartões, movimento leve ao passar o cursor e ampliação discreta das capas.
- **Questões:** transição curta ao abrir outra questão; seleção de alternativa com resposta visual imediata.
- **Correção:** resultado, justificativas das alternativas, classificação e ações posteriores surgem em sequência curta.
- **Ferramentas:** animações em botões, filtros, marcadores de questão, marca-texto, controles de V/F e menus.
- **Anotações e comentários:** abertura gradual do painel de anotações e aparecimento dos comentários públicos.
- **Avisos, confirmação e sincronização:** entrada suave de janelas e notificações.
- **Tutorial:** apresentação e troca de etapas com transições, preservando os destaques e a possibilidade de fechar imediatamente.
- **Acessibilidade:** ao ativar a preferência de movimento reduzido no dispositivo, as animações são praticamente desativadas.

## Arquivos acrescentados

- `motion.css` e `motion.js`: transições e lógica de animação no aplicativo.
- `motion-host.css`: transições na janela externa, tutorial e sincronização.

Os arquivos `app.html` e `index.html` foram atualizados apenas para carregá-los. As questões, os gabaritos, os IDs e o funcionamento da sincronização não foram alterados.

## Publicação

Substitua o conteúdo do repositório GitHub Pages pelo conteúdo da pasta `bibliotecadeprovao-main`, **incluindo os três novos arquivos de animação**. Não é necessário executar SQL nem modificar o Supabase.

## Verificações locais

- 17 provas disponíveis; fluxo de pergunta/resposta e confirmação.
- Exibição de gabarito comentado, classificação, anotações e diálogo de alteração de gabarito.
- Reabertura do tutorial pelo botão `?` e navegação pelas 11 etapas.
- Versões para desktop, tablet e celular, inclusive pesquisa sem animação repetitiva.
- Preferência do sistema `prefers-reduced-motion`.

As verificações foram realizadas em um navegador automatizado com os recursos do site carregados localmente. A versão publicada no GitHub não foi alterada nesta entrega.
