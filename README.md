# Ficha RPG Semi Deuses

Sistema web estatico para criar, salvar, exportar e imprimir fichas de personagens para mesas de RPG.

-- https://zkillayt.github.io/Projetec-RPG---Semi-Deuses/ -- 

## Problema

Em mesas presenciais de RPG, fichas fisicas costumam gerar alguns problemas:

- folhas rasuradas depois de muitas alteracoes;
- perda de informacoes entre sessoes;
- dificuldade para atualizar PV, MP, pericias e recursos durante o jogo;
- varias copias diferentes da mesma ficha;
- trabalho extra para refazer ou organizar personagens recorrentes.

Este projeto foi criado para resolver esse fluxo na minha mesa de RPG, mantendo a ficha editavel no navegador e permitindo gerar uma versao impressa mais bonita quando for necessario levar para a mesa.

## Solucao

A aplicacao funciona direto no navegador, sem backend e sem banco de dados. Ela salva os personagens em `localStorage`, permite multiplos perfis e exporta/importa arquivos JSON para backup.

Tambem existe uma pagina de impressao em A4, feita para substituir ou complementar a ficha fisica com um layout mais limpo, compacto e facil de consultar durante a sessao.

## Recursos

- Criacao e edicao de personagens.
- Multiplos perfis salvos no navegador.
- Salvamento automatico em `localStorage`.
- Botao para salvar, carregar, criar e excluir perfis.
- Exportacao e importacao de perfil em JSON.
- Calculo automatico de modificadores, salvaguardas e pericias.
- Marcadores interativos de Favor Divino.
- Tabelas editaveis para armas, talentos, habilidades, equipamentos e reliquias.
- Tema visual inspirado em semideuses, Olimpo e fichas classicas de RPG.
- Versao de impressao em A4 com visual organizado para mesa.
- Compatibilidade com GitHub Pages.

## Tecnologias

- HTML5
- CSS3
- JavaScript puro
- localStorage

## Estrutura do projeto

```text
/
|-- index.html
|-- print.html
|-- README.md
|-- assets/
|   `-- olympus-crest.svg
|-- css/
|   |-- style.css
|   `-- print.css
|-- data/
|   `-- defaultCharacter.js
`-- js/
    `-- script.js
```

## Como usar

1. Abra `index.html` no navegador.
2. Preencha os dados da ficha nas abas.
3. Use **Salvar perfil** para guardar o personagem.
4. Use a aba **Exportar** para importar ou exportar JSON.
5. Clique em **Gerar ficha para impressao** para abrir `print.html`.
6. Na pagina de impressao, clique em **Imprimir / Salvar em PDF**.

## Publicacao no GitHub Pages

Como o projeto e totalmente estatico, basta publicar a pasta no GitHub Pages. Nao existe etapa de build, instalacao de dependencias ou servidor.

## Backup dos dados

Os perfis ficam salvos apenas no navegador usado pelo jogador. Para trocar de computador, limpar o navegador ou compartilhar a ficha, use **Exportar perfil JSON** e depois **Importar perfil JSON**.
