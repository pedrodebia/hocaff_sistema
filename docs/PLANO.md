# Plano de construção — Sistema Hocaff

Onze fases. Cada uma entrega algo utilizável e tem critério de aceite objetivo.
Não avance sem o critério cumprido: fase mal fechada custa três vezes mais depois.

**Estimativa realista:** cerca de 16 semanas de trabalho focado. Em ritmo de noites
e fins de semana com o Claude Code, planeje 4 a 6 meses. Não é pessimismo — é o
que separa um projeto que termina de um que fica pela metade.

---

## Regras de ouro do desenvolvimento

1. **Migração aplicada nunca é editada.** Corrigiu? Nova migração. Isso vale desde
   o primeiro dia, inclusive em desenvolvimento.
2. **Toda policy de RLS tem teste.** Um teste que loga como cada papel e confirma
   que o dado restrito não vem. Sem isso, o modelo de confidencialidade é fé.
3. **Seed realista desde a fase 0.** Os dois projetos de exemplo das planilhas
   (`I-0245` e `I-0246`) com suas oportunidades, revisões, HH e medições. Você
   precisa ver número na tela para saber se a tela está certa.
4. **Nenhum número de política no código.** Margem, alçada, alíquota, limite de
   alerta — tudo vem de `parametro` ou `tributo`, com vigência.
5. **Nenhuma lista no código.** Toda taxonomia vem de `taxonomia_item`.
6. **Uma fase por branch.** Merge só com o critério de aceite cumprido.

---

## F0 · Fundação  — 1 a 2 semanas

Projeto Next.js com App Router e TypeScript. Supabase criado, `schema.sql` aplicado
como primeira migração. Autenticação por e-mail corporativo. Layout com navegação
por papel. Telas de administração de `taxonomia_item` e `parametro`.

**Aceite:** você loga, vê seu papel, edita uma taxonomia pela interface e o novo
item aparece num dropdown de outra tela. Um usuário sem papel restrito recebe
zero linhas ao consultar `custo_recurso` — comprovado por teste automatizado.

**Não faça ainda:** nenhuma tela de negócio, nenhum gráfico.

## F1 · Cadastros  — 1 semana

Pessoas, com papéis, cargo, nível, vínculo, jornada e aproveitamento. Clientes com
grupo econômico. Tela de capacidade instalada calculada a partir das pessoas ativas.

**Aceite:** os 11 profissionais conhecidos cadastrados, capacidade instalada
batendo com a aba CAPACIDADE do `CAD_PESSOAS.xlsx`.

## F2 · Timesheet  — 1 a 2 semanas

**Priorizado deliberadamente:** é o maior volume, o maior ganho sobre a planilha, e
quanto antes começar a coletar, mais cedo o histórico existe.

Lançamento **mobile-first**, visão semanal. Atividades fora de projeto obrigatórias
no seletor. RLS: cada pessoa só o seu. Resumo mensal pessoal com percentual
apropriado a projeto.

**Aceite:** uma pessoa lança a semana pelo celular em menos de dois minutos.
Outra pessoa, logada, não consegue ver esse lançamento nem pela API.
Um apontamento em projeto sem TAP é recusado pelo banco.

## F3 · Funil  — 2 semanas

Oportunidades com obrigatoriedade progressiva por estágio. Portão 1 com os seis
critérios e as duas assinaturas. Revisões com histórico completo. HH previsto por
cargo e nível. Lista com filtros por estágio, cliente, segmento, origem e responsável.

**Aceite:** registrar uma oportunidade nova custa 9 campos e menos de um minuto.
Tentar gravar estágio 1 com uma assinatura só é recusado. Tentar gravar perda sem
motivo é recusado. Duas revisões vigentes na mesma oportunidade é recusado.

## F4 · Preço e Portão 2  — 1 semana

Tela restrita de composição: o GCM registra custo, BDI e margem a partir do Excel de
orçamento, e o sistema calcula preço sugerido e preço mínimo autorizado com as
fórmulas do `CLAUDE.md`. Alçada calculada pela faixa. Justificativa obrigatória
abaixo da margem mínima na instância máxima.

**Aceite:** o Coordenador de Novos Negócios enxerga preço sugerido e preço mínimo,
e **não** enxerga custo nem margem — comprovado por teste de RLS, não por
inspeção de tela. O preço mínimo confere com a fórmula que tem a carga tributária
no denominador.

## F5 · TAP e portfólio  — 2 semanas

Portão 3: assistente que cria o projeto a partir da oportunidade ganha, copiando
escopo, premissas, valor, cronograma e **congelando o HH baseline**. Geração do TAP
em PDF para assinatura. Equipe, marcos e riscos. Roteiro da reunião como checklist.

**Aceite:** um projeto só existe com TAP assinado. O baseline não muda quando a
revisão de origem é editada depois — teste explícito para isso.

## F6 · Medição  — 1 semana

Medição física pelo Coordenador, sem nenhum valor em reais. Envio ao GCM. Medição
financeira e faturamento do lado restrito, com vencimento calculado.

**Aceite:** o Coordenador atesta a medição sem ver preço unitário. O GCM converte
em valor. O aging de recebíveis fecha com o cálculo da planilha.

## F7 · Custos e margem  — 1 a 2 semanas

Custo realizado a partir dos apontamentos, valorado pela vigência do mês. Custo
projetado no encerramento. Margem prevista, projetada e desvio, por projeto e para
a carteira.

**Aceite:** reproduz os números do `BASE_CUSTOS_MEDICOES.xlsx` para os dois projetos
de exemplo, incluindo `I-0245` com margem prevista de 12,2% e projetada de 16,0%.
Um reajuste no custo horário **não** altera o custo de meses anteriores.

## F8 · Financeiro  — 2 semanas

Receitas e despesas por evento. Fluxo de 24 meses nas visões de competência e caixa.
Capital de giro. Premissas com saldo inicial e caixa mínimo. Receita provável fora
do caixa por padrão.

**Aceite:** reproduz o fluxo do `PLAN_FINANCEIRO.xlsx`. O descompasso acumulado bate.

## F9 · Dashboards  — 2 semanas

Quatro painéis com **filtros de verdade** — período, grupo, cliente, segmento,
responsável — e drill-down do agregado para a lista. Novos Negócios, Gestão de
Projetos, Custos e Margem (restrito), Executivo.

**Aceite:** os números conferem com os painéis das planilhas. Aplicar um filtro não
repinta as séries sobreviventes com cores diferentes.

## F10 · Encerramento e lições aprendidas  — 1 semana

Portão 4 e Portão 5. Comparação realizado × orçado por função e nível. Registro de
lições. Realimentação do próximo orçamento.

**Aceite:** ao encerrar um projeto, a comparação de HH por função fica disponível
para consulta na hora de orçar um projeto semelhante.

---

## Migração dos dados

Não migre as planilhas inteiras. Migre:

- **Cadastros completos** — pessoas, clientes, taxonomias
- **Contratos vigentes** — projeto, baseline, equipe, marcos, medições já feitas
- **Funil em aberto** — oportunidades nos estágios 0 a 4
- **Histórico do funil fechado** — só cabeçalho: cliente, objeto, valor, desfecho,
  motivo. Sem revisões, sem HH.

O que ficou para trás continua nas planilhas, arquivadas. Migrar histórico completo
custa semanas e entrega quase nada.

## Riscos a vigiar

**Adoção do timesheet.** É onde o sistema vive ou morre. Se as 60 pessoas não
lançarem, todo o resto vira ficção. Trate a fase 2 como produto, não como formulário.

**Você é o único que mantém.** Um sistema que roda o financeiro da empresa e depende
de uma pessoa é risco operacional. Documente, versione, e faça backup automático do
Supabase desde o primeiro dia.

**Decisões ainda provisórias.** Taxonomias, metas, decomposição dos 18%, calibragem
do BDI. Por isso são dado com vigência, e não código. Quando mudarem — e vão —
é edição de registro.
