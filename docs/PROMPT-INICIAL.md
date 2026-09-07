# Como começar com o Claude Code

## Antes de abrir o terminal

```bash
mkdir hocaff-sistema && cd hocaff-sistema
git init
mkdir -p docs supabase/migrations
```

Copie para dentro do repositório:

| Arquivo | Destino |
|---|---|
| `CLAUDE.md` | **raiz do repositório** — o Claude Code lê automaticamente |
| `schema.sql` | `supabase/migrations/0001_schema_inicial.sql` |
| `PLANO.md` | `docs/PLANO.md` |
| Documentos E0 a E10 | `docs/especificacao/` |

O `CLAUDE.md` na raiz é o que faz diferença: ele entra em toda conversa sem você
precisar repetir o contexto.

Crie o projeto no Supabase, guarde a connection string e as chaves.

---

## Prompt de abertura — Fase 0

Cole isto na primeira conversa:

---

Vou construir um sistema interno de gestão para a Hocaff Engenharia, um escritório
de projetos de engenharia com cerca de 40 profissionais próprios e 20 terceirizados.

Leia o `CLAUDE.md` na raiz antes de qualquer coisa — ele tem o domínio, o modelo de
confidencialidade e as regras de negócio inegociáveis. Leia também `docs/PLANO.md`,
onde as fases estão definidas com critério de aceite.

O schema do banco já está pronto e testado em `supabase/migrations/0001_schema_inicial.sql`.
Ele foi validado contra PostgreSQL 16: as regras duras já são barradas pelo próprio
banco (duas assinaturas na qualificação, perda exige motivo, apontamento em projeto
sem TAP é recusado, uma só revisão vigente por oportunidade, vigências de custo não
se sobrepõem). Não reescreva esse schema. Se precisar mudar algo, crie uma migração
nova — nunca edite uma migração já aplicada.

Estamos na **Fase 0 — Fundação**. Entregas:

1. Projeto Next.js com App Router, TypeScript e Tailwind, com shadcn/ui configurado
2. Cliente Supabase para servidor e para browser, com sessão via cookie
3. Autenticação por e-mail, com a sessão ligada à tabela `pessoa` pelo `auth_user_id`
4. Layout com navegação lateral que muda conforme os papéis do usuário
5. Telas de administração de `taxonomia_item` e de `parametro`, com CRUD completo
6. Seed de desenvolvimento com os 11 profissionais reais e os dois projetos de
   exemplo, `I-0245` e `I-0246`
7. Testes automatizados de RLS: para cada papel, verificar o que ele consegue e o que
   ele **não** consegue ler nas tabelas restritas

Três restrições que valem para o projeto inteiro:

- Autorização é responsabilidade do banco, via RLS. A interface pode esconder um
  campo por conveniência, mas a garantia é a policy. Nunca confie em checagem no
  front.
- Nenhum número de política e nenhuma lista no código. Margens, alçadas, alíquotas,
  limites de alerta e taxonomias vêm do banco, com vigência quando aplicável.
- O domínio é escrito em português — tabelas, colunas, rotas e rótulos.

Comece propondo a estrutura de pastas e a ordem das tarefas da Fase 0. Não escreva
código antes de eu aprovar a estrutura.

---

## Como conduzir as fases seguintes

Abra uma conversa nova a cada fase, com um prompt curto:

> Estamos na Fase 3 — Funil. Leia o `CLAUDE.md` e a seção da Fase 3 em
> `docs/PLANO.md`. As fases 0 a 2 estão concluídas e mergeadas. Proponha o plano de
> tarefas antes de escrever código.

Conversa por fase mantém o contexto enxuto e o Claude focado.

## Hábitos que fazem diferença

**Peça o plano antes do código.** Sempre. Corrigir um plano custa uma mensagem;
corrigir código custa uma tarde.

**Exija o teste de RLS junto com a tela.** Toda vez que uma tela nova tocar dado
restrito, o teste vem no mesmo commit. Modelo de confidencialidade sem teste é
promessa.

**Não aceite número mágico.** Se aparecer `0.15` no código, peça para trocar por
`param('margem_minima_grande')`. É a diferença entre ajustar uma política em
trinta segundos ou em um deploy.

**Rode a migração num banco limpo de tempos em tempos.** Migração que só funciona
em cima do estado atual é uma bomba-relógio.

**Feche a fase antes de abrir a próxima.** O critério de aceite existe para isso.

## Quando pedir ajuda de volta

Volte aqui — ou traga o repositório para uma conversa nova — quando:

- Uma regra de negócio da especificação parecer ambígua na hora de codificar
- Precisar decidir entre duas modelagens e a escolha parecer irreversível
- Os números do sistema não baterem com os das planilhas
- For a hora de migrar os dados reais

A especificação E0 a E10 responde quase tudo. Quando ela não responder, a dúvida
provavelmente é uma decisão de negócio que ainda não foi tomada — e essa não é
do Claude Code.
