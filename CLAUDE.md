# Hocaff — Sistema de Gestão de Novos Negócios e Projetos

Contexto permanente do projeto. Leia antes de qualquer tarefa.

---

## 1. O que é

Sistema interno da **Hocaff Engenharia**, escritório de projetos de engenharia
(infraestrutura e edificações), cerca de 40 profissionais próprios e 20 terceirizados.

Cobre o ciclo completo: oportunidade → proposta → contrato → execução → medição →
faturamento → encerramento, com apontamento de horas de toda a equipe.

Substitui um conjunto de planilhas Excel cuja especificação está integralmente
refletida neste documento e no `schema.sql`.

## 2. Stack

| Camada | Escolha |
|---|---|
| Framework | Next.js (App Router) + TypeScript |
| Banco | PostgreSQL no Supabase |
| Auth | Supabase Auth (e-mail corporativo) |
| Autorização | **Row Level Security do Postgres** — não checagem na aplicação |
| ORM | Acesso via `supabase-js`; migrações em SQL puro versionado |
| UI | Tailwind + shadcn/ui |
| Gráficos | Recharts |
| Deploy | Vercel |

**Regra inegociável:** toda restrição de acesso é implementada em RLS no banco.
A interface pode esconder um campo por conveniência, mas a garantia é do banco.
Se o front esquecer de esconder, o banco não devolve o dado.

## 3. Papéis

| Sigla | Papel | Ocupante atual |
|---|---|---|
| `CNN` | Coordenador de Novos Negócios | Guilherme Koike |
| `DT` | Diretoria Técnica | Ana Flávia Pontes |
| `DE` | Diretoria de Engenharia | Caio Condi |
| `GPR` | Gerência de Projetos | Giovanna Arroyo |
| `CPR` | Coordenador de Projetos | 6 pessoas |
| `LT` | Líder Técnico | a definir |
| `GCM` | Gestão de Custos e Medições | posição a preencher |
| `ADM` | Administrativo / Financeiro | Angélica Pontes |

Uma pessoa pode ter mais de um papel.

## 4. O modelo de confidencialidade — o requisito central

A equipe de Gestão de Projetos gere por **horas**, nunca por reais de custo.
Isso não é preferência de interface: é a regra que estrutura o banco.

### Aberto a qualquer usuário autenticado
Escopo, premissas, exclusões, prazos, marcos, **valor do contrato**, valores de
subcontratos, HH previsto e realizado por função e nível, avanço físico,
medição física, preço sugerido e preço mínimo autorizado.

### Restrito a `GCM`, `DE` e `DT`
Custo horário por função e nível, custo realizado, custo total, **margem**,
BDI aplicado, composição do orçamento, medição financeira, faturamento,
recebimento, todo o planejamento financeiro.

### Por que o valor do contrato é aberto
Em contrato com Poder Público o valor é publicado por lei, e o cliente privado
conhece o preço que contratou. Sigilo sobre ele não seria sustentável.
O que precisa de proteção é **custo e margem**.

### Como implementar
Postgres tem RLS por linha, não por coluna. Portanto **dados sensíveis vivem em
tabelas separadas** com policy restritiva, e as tabelas abertas não contêm nenhuma
coluna sensível. Nunca use uma coluna sensível numa tabela aberta contando com o
front para escondê-la.

Pares tabela aberta / tabela restrita:

| Aberta | Restrita |
|---|---|
| `revisao` | `revisao_economico` |
| `projeto` | `projeto_economico` |
| `apontamento` | `custo_apontamento` (view materializada) |
| `medicao_fisica` | `medicao_financeira`, `faturamento` |

### Fluxo de mão única
**HH atravessa do lado aberto para o restrito. Valor nunca atravessa de volta.**
As duas únicas exceções, deliberadas: `preco_sugerido` e `preco_minimo_autorizado`,
que o GCM devolve para quem negocia.

## 5. Regras de negócio inegociáveis

1. **Toda oportunidade é registrada**, inclusive a recusada em cinco minutos.
   O registro inicial exige 9 campos; o resto só se torna obrigatório conforme
   o estágio avança.
2. **A qualificação exige duas pessoas** — para o Go e para o No-Go.
3. **Perda exige motivo** — obrigatório para gravar o estágio 6.
4. **Proposta abaixo da margem mínima sobe uma alçada.** Na instância máxima,
   exige justificativa registrada.
5. **Sem TAP assinado, o projeto não existe** no portfólio e não aceita
   apontamento de horas.
6. **Aditivo passa pelo funil completo** — orçamento e aprovação de preço.
7. **Custo e margem só existem nas tabelas restritas.**
8. **HH atravessa; valor não volta.**
9. **Do orçamento voltam dois números** para quem negocia.
10. **Toda revisão de proposta é registro novo.** Nada é sobrescrito; a anterior
    passa a `substituida`.
11. **Toda tabela de parâmetro que muda com o tempo tem vigência.** Custo horário,
    alíquotas, margens. Reajuste fecha a vigência atual e abre linhas novas —
    nunca altera um valor já usado. Sobrescrever reescreveria a história e
    invalidaria a comparação realizado × orçado.

## 6. Identificadores

| Chave | Formato | Nasce em |
|---|---|---|
| `codigo` de cliente | `CLI-0001` | Cadastro |
| `codigo` de oportunidade | `OP-I-0312` — prefixo + letra do grupo + 4 dígitos | Entrada do funil |
| `codigo` de revisão | `<oportunidade>-R00` | Cada revisão |
| `codigo` de projeto | `I-0245` — letra do grupo + 4 dígitos | Assinatura do TAP |
| `codigo` de contrato | `<projeto>-01` | Assinatura; `-02` para aditivos |

Duas sequências separadas para oportunidade e projeto: oportunidades são muito
mais numerosas e a maioria não fecha. `I-0245` significa "o 245º projeto de
infraestrutura" e esse significado é histórico, precisa ser preservado.

A letra do grupo fica **também** em coluna própria, além de embutida no código.

## 7. Estágios do funil

`0` Identificada · `1` Qualificada (Go) · `2` Em orçamento · `3` Proposta enviada ·
`4` Em negociação/revisão · `5` Ganha · `6` Perdida · `7` Cancelada/Deserta · `8` No-Go

Obrigatoriedade progressiva por estágio — a aplicação valida na transição, não na
digitação de cada campo.

## 8. Fórmulas que a aplicação precisa acertar

```
Preço                    = Custo direto × (1 + BDI)
Margem bruta             = BDI / (1 + BDI)
Margem líquida           = BDI / (1 + BDI) − carga tributária
Preço mínimo autorizado  = Custo Hocaff / (1 − margem mínima − carga total) + faturamento direto
Custo projetado          = Custo realizado / % avanço físico + custos externos Hocaff
Margem projetada         = (Receita Hocaff − Custo projetado − tributos) / Receita Hocaff
```

**Atenção:** o preço mínimo **não** é `custo ÷ (1 − margem mínima)`. A margem é
líquida, então a carga tributária entra no denominador. A fórmula errada produz
um piso baixo demais e permite fechar abaixo da margem sem ninguém perceber.

### Faturamento direto
Alguns contratantes emitem a NF de material, locação ou serviço diretamente contra
si, para evitar bitributação. Esse valor **compõe o custo do escopo mas não passa
pelo faturamento da Hocaff** — logo não é base de imposto, e recebe **BDI reduzido**,
sem a parcela tributária. Toda linha de custo tem a marcação `faturamento_direto`.

### Faixas de margem
| Faixa | Mínima | Alvo |
|---|---|---|
| Até R$ 100.000 | 20% | 25% |
| Acima de R$ 100.000 | 15% | 20% |

Desempate: a faixa é definida pelo preço alvo; se ficar a menos de 5% do limite,
prevalece a margem mais alta.

### Alçadas
Até R$ 500.000 a `DT` aprova sozinha. Acima, `DT` **e** `DE` em conjunto —
instância máxima. Abaixo da margem mínima sobe uma alçada; já na máxima, exige
justificativa registrada.

**Todos esses números são parâmetros com vigência, não constantes.**

## 9. O que fica fora do sistema

**A planilha de orçamento continua em Excel.** Ela é um documento de cálculo, um
arquivo por proposta, com memória de cálculo e desbalanceamento manual de BDI por
linha. O sistema guarda o **link** do arquivo e os **resultados** — HH previsto por
função e nível, custo, BDI, margem, preço sugerido, preço mínimo — mas não
reimplementa a composição.

**O Conta Azul continua sendo a fonte da verdade** de NF emitida e recebimento real.
O sistema guarda a **previsão**; a conciliação é pelo código do projeto. Nenhum
lançamento contábil é duplicado.

## 10. Timesheet

O ponto de maior volume: 60 pessoas apontando.

- Lançamento diário ou semanal, **mobile-first**
- Cada pessoa enxerga e edita **apenas os próprios apontamentos** (RLS por `pessoa_id`)
- `GPR` e `CPR` veem os agregados dos seus projetos, não o detalhe de outras pessoas
- `GCM` vê tudo, porque precisa custear

**Categorias fora de projeto são obrigatórias no modelo.** Sem elas as pessoas
empurram hora para dentro de projeto e o custo de todos vira ficção:
Apoio a Novos Negócios · Comercial/visita · Administrativo · Treinamento ·
Férias/afastamento · Feriado · **Sem alocação (ocioso)**.

Duas delas geram informação que hoje não existe: *Apoio a Novos Negócios* mede
quanto custa orçar, inclusive o que não se ganha; *Sem alocação* mede capacidade
sobrando.

## 11. Convenções de código

- Idioma do domínio em **português** — tabelas, colunas, rotas e labels.
  Termos técnicos do stack em inglês. Não traduza `id`, `created_at`.
- Migrações em `supabase/migrations/`, numeradas, **nunca editadas depois de aplicadas**.
- Toda tabela: `id uuid primary key default gen_random_uuid()`,
  `criado_em`, `criado_por`, `alterado_em`, `alterado_por`.
- Soft delete por `ativo boolean` — nada é apagado. Registros históricos apontam
  para taxonomias e pessoas que saíram.
- Valores monetários em `numeric(14,2)`. **Nunca `float`.**
- Percentuais em `numeric(7,6)` como fração (0.15 = 15%).
- Datas de vigência: `vigencia_inicio date not null`, `vigencia_fim date not null
  default '2099-12-31'`.
- Toda taxonomia é dado em `taxonomia_item`, **nunca um enum no código**. Mudar uma
  lista é editar registro, jamais migração.

## 12. Documentação de origem

A especificação funcional completa está nos documentos E0 a E10 do projeto
"Processo de Novos Negócios e Propostas". Em caso de dúvida sobre uma regra,
eles são a fonte — e este arquivo é o resumo operante.
