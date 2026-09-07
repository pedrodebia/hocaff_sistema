# Hocaff — Sistema de Gestão de Novos Negócios e Projetos

Sistema interno da Hocaff Engenharia. Cobre o ciclo oportunidade → proposta →
contrato → execução → medição → faturamento → encerramento, com apontamento de
horas de toda a equipe.

O contexto de domínio, o modelo de confidencialidade e as regras inegociáveis
estão em [`CLAUDE.md`](CLAUDE.md). O roteiro de construção está em
[`docs/PLANO.md`](docs/PLANO.md).

**Estado: Fase 0 concluída.** Fundação, autenticação, navegação por papel,
administração de taxonomias e parâmetros, seed realista e testes de RLS.

---

## Como levantar

Precisa de Node 20 ou mais novo e de um projeto no Supabase.

### 1. Dependências

```bash
npm install
```

### 2. Ambiente

```bash
cp .env.local.example .env.local
```

Preencha com os dados do seu projeto no Supabase:

| Variável | Onde achar |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API → `service_role` |
| `DATABASE_URL` | Project Settings → Database → Connection string → URI |

A `service_role` ignora a RLS. Ela só é usada pelo seed e pelos testes — nunca
por uma página ou Server Action. `src/lib/supabase/admin.ts` existe justamente
para deixar isso explícito.

### 3. Banco

```bash
npm run db:aplicar
```

Aplica as migrações em ordem, cada uma numa transação, registrando o que já
rodou em `_migracao_aplicada`. `npm run db:status` mostra o que está pendente
sem aplicar nada.

Se um arquivo já aplicado for editado, o aplicador para: **migração aplicada
nunca é editada**. Corrigiu? Migração nova.

### 4. Dados de desenvolvimento

```bash
npm run seed
```

Cria os 11 profissionais do `CAD_PESSOAS.xlsx`, os dois projetos de exemplo
`I-0245` e `I-0246` com oportunidade, revisões, baseline, equipe, marcos,
riscos, medições e apontamentos, e o lado restrito (custo horário, medição
financeira, faturamento).

Todas as contas ficam com a mesma senha de desenvolvimento, impressa no fim do
seed. Para navegar por papel:

| Papel | Conta |
|---|---|
| `DE` Diretoria de Engenharia | `caio.condi@hocaff.com.br` |
| `DT` Diretoria Técnica | `ana.pontes@hocaff.com.br` |
| `CNN` Novos Negócios | `guilherme.koike@hocaff.com.br` |
| `GPR` Gerência de Projetos | `giovanna.arroyo@hocaff.com.br` |
| `CPR` Coordenação de Projetos | `hugo.schneider@hocaff.com.br` |
| `GCM` Custos e Medições | `gcm@hocaff.com.br` |
| `ADM` Administrativo | `angelica.pontes@hocaff.com.br` |

### 5. Rodar

```bash
npm run dev
```

---

## Testes

### Migrações num banco limpo — sem Supabase, sem Docker

```bash
npm run db:validar
```

Sobe um PostgreSQL em WebAssembly, aplica as quatro migrações do zero e confere
a estrutura e as regras duras: as duas assinaturas da qualificação, perda com
motivo, uma só revisão vigente, vigências sem sobreposição, `reajustar_parametro`
fechando a vigência anterior, `param()` respondendo pela data. Confere também as
fórmulas de preço contra os números do `BASE_CUSTOS_MEDICOES.xlsx`.

Roda em segundos e não precisa de credencial nenhuma. É a defesa contra a
migração que só funciona em cima do estado atual do seu banco.

Ele **não** cobre RLS: sem sessão de verdade, as policies são criadas mas nunca
exercidas. Para isso, o próximo bloco.

### RLS, contra um Supabase de verdade

```bash
npm run teste
```

Não são testes de unidade: eles logam de verdade como cada papel e conferem o
que o banco devolve.

| Arquivo | O que prova |
|---|---|
| `confidencialidade.test.ts` | Custo, margem e faturamento devolvem **zero linha** para todo papel fora de `GCM`, `DE` e `DT`. Inclui as views, que sem `security_invoker` seriam porta dos fundos |
| `timesheet.test.ts` | Cada pessoa só vê e edita as próprias horas; projeto sem TAP recusa apontamento |
| `administracao.test.ts` | Taxonomia e parâmetro só a Diretoria escreve; reajuste fecha vigência em vez de sobrescrever |
| `regras-duras.test.ts` | Duas assinaturas na qualificação, perda com motivo, uma só revisão vigente, vigências de custo sem sobreposição |

Rode o seed antes: um teste que conta zero linha numa tabela vazia não
distingue policy boa de policy ausente. Os testes verificam isso e falham com
mensagem clara se a tabela estiver vazia.

---

## Estrutura

```
src/
  app/
    entrar/                  autenticação por e-mail (senha ou link)
    auth/confirmar/          troca do token do link pela sessão
    (app)/                   tudo que exige sessão
      inicio/
      diagnostico/           o que a sua sessão lê e o que não lê, ao vivo
      admin/taxonomias/      CRUD das listas do sistema
      admin/parametros/      valores de política, com vigência
  componentes/
    ui/                      primitivos no padrão shadcn/ui
    marca/                   logotipo
  lib/
    supabase/                clientes de navegador, servidor e serviço
    sessao.ts                pessoa + papéis do usuário logado
    navegacao.ts             menu, filtrado por papel
    papeis.ts                espelho do enum `papel` do Postgres
    taxonomias.ts            espelho do enum `taxonomia_tipo`
  proxy.ts                   renovação de sessão a cada navegação
supabase/
  migrations/                SQL versionado, nunca editado depois de aplicado
  seed/                      dados de desenvolvimento, vindos das planilhas
  aplicar.ts                 aplicador de migrações
  validar.mjs                aplica tudo num Postgres limpo em WebAssembly
testes/rls/                  testes de acesso, por papel
```

---

## Migrações

| Arquivo | O que faz |
|---|---|
| `0001_schema_inicial.sql` | Schema completo: tabelas, regras duras, RLS, views, seeds mínimos |
| `0002_taxonomias_completas.sql` | Todas as listas do `CAD_PARAMETROS.xlsx` |
| `0003_seguranca_views_e_funcoes.sql` | `security_invoker` nas views, `search_path` fixo nas funções, trigger de `alterado_em` |
| `0004_parametro_vigencia.sql` | Vigências de parâmetro sem sobreposição e `reajustar_parametro()` |

A 0003 fecha uma brecha real: no PostgreSQL, uma view comum roda com os
privilégios do **dono**, não de quem consulta. Sem `security_invoker`,
`v_custo_realizado` devolveria custo horário e custo realizado para qualquer
usuário autenticado, passando por cima da policy de `custo_recurso`.

---

## Regras que valem para o projeto inteiro

1. **Autorização é do banco.** A interface pode esconder um campo por
   conveniência; a garantia é a policy. Toda tela nova que toca dado restrito
   vem com teste de RLS no mesmo commit.
2. **Nenhum número de política no código.** Margem, alçada, alíquota, limite de
   alerta — tudo vem de `parametro` ou `tributo`, com vigência.
3. **Nenhuma lista no código.** Toda taxonomia vem de `taxonomia_item`.
4. **Migração aplicada nunca é editada.**
5. **Nada é excluído.** Soft delete por `ativo`; registros históricos apontam
   para taxonomias e pessoas que saíram.
6. **O domínio é escrito em português** — tabelas, colunas, rotas e rótulos.

---

## Uma nota sobre o caminho do projeto

Não coloque o repositório num diretório cujo nome contenha `#`. O Turbopack
trata o caractere como início de fragmento de URL, e a resolução de caminho do
Tailwind quebra com `ERR_INVALID_ARG_VALUE`. Foi por isso que o projeto saiu
de `C:\#05_CLAUDE.CODE` e foi para `C:\dev`.
