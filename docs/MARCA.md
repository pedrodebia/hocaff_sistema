# Marca no sistema

O kit de identidade visual da Hocaff está traduzido em tokens CSS em
[`src/app/globals.css`](../src/app/globals.css). Nenhum componente escreve
hexadecimal: tudo passa pelos tokens.

## Cores

| Token | Valor | Uso |
|---|---|---|
| `--color-marca-azul` | `#0A3050` | Azul Hocaff. Títulos, botão primário |
| `--color-marca-azul-profundo` | `#072A3E` | Barra lateral, painel de entrada |
| `--color-marca-verde` | `#00A789` | Verde Engenharia. Ação, foco, confirmação |
| `--color-marca-verde-claro` | `#4ED4C1` | Destaque sobre fundo escuro |
| `--color-marca-grafite` | `#1B232B` | Texto corrido |
| `--color-marca-cinza-claro` | `#E6E9EC` | Superfície secundária |
| `--color-marca-cinza-medio` | `#A9A1BA` | — |
| `--color-marca-areia` | `#C9BEA5` | — |
| `--color-marca-offwhite` | `#F5F7F8` | Fundo da aplicação |
| `--color-marca-amarelo` | `#FFC107` | Amarelo Energia. Atenção |
| `--color-marca-laranja` | `#FF6A00` | Laranja Foco |
| `--color-marca-roxo` | `#6C5CE7` | Roxo Tecnológico |

Os nomes semânticos (`primary`, `accent`, `muted`, `border`, `destructive`…)
seguem a convenção do shadcn/ui, apontando para as cores acima. Isso mantém
`npx shadcn@latest add <componente>` funcionando sem ajuste.

## Tipografia

O kit especifica **Gotham** (Bold para títulos, Medium para subtítulos, Book
para texto). Não há licença web dela no projeto, então:

- Títulos: **Montserrat** — a geométrica aberta mais próxima, mesmo esqueleto e
  mesma leitura em caixa alta
- Texto: **Inter**

Se a Hocaff licenciar Gotham para web, a troca é só no bloco de fontes de
[`src/app/layout.tsx`](../src/app/layout.tsx). Os tokens `--font-titulo` e
`--font-sans` não mudam.

## Logotipo

`src/componentes/marca/logo.tsx` desenha o símbolo em SVG com as cores do kit,
e a assinatura em texto vivo. É uma **reconstrução**, não o arquivo oficial:
resolve enquanto o SVG original não está no repositório, e é nítida em qualquer
densidade de tela.

Para usar o arquivo oficial:

1. Salve o SVG (ou o PNG em alta resolução) em `public/marca/hocaff.svg`
2. Em `logo.tsx`, troque o corpo de `Simbolo` por
   `<img src="/marca/hocaff.svg" alt="Hocaff Engenharia" />`, ou cole o
   conteúdo do SVG oficial no lugar do desenho atual
3. Se o arquivo oficial já trouxer a assinatura "HOCAFF ENGENHARIA", passe
   `compacto` para o componente parar de desenhar o texto

O componente aceita `invertido` para fundo escuro (barra lateral e tela de
entrada) e `compacto` para só o símbolo (cabeçalho no celular).

## Aplicação na interface

- **Barra lateral** em azul profundo, item ativo com traço verde-claro — a
  presença de marca mais constante da tela
- **Tela de entrada** com o painel da marca à esquerda, repetindo a assinatura
  "Projetamos soluções. Construímos o futuro."
- **Títulos** em azul Hocaff; **ações de confirmação** em verde Engenharia
- **Amarelo Energia** reservado a aviso; **vermelho** só a erro e recusa
