/**
 * Valida as migrações contra um Postgres LIMPO, sem Docker e sem Supabase.
 *
 *   npm run db:validar
 *
 * Usa PGlite — Postgres compilado para WebAssembly — para criar um banco do
 * zero, aplicar as migrações em ordem e conferir as regras duras. É a resposta
 * ao hábito do PLANO.md: "rode a migração num banco limpo de tempos em tempos.
 * Migração que só funciona em cima do estado atual é uma bomba-relógio."
 *
 * O que ele NÃO cobre: RLS. Aqui não existe sessão de usuário nem `auth.uid()`
 * de verdade — as policies são criadas mas nunca exercidas. Quem prova o
 * modelo de confidencialidade é `npm run teste:rls`, contra um Supabase real.
 */

import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const PASTA = join(process.cwd(), "supabase", "migrations");

/** O que o Supabase provê e o Postgres puro não tem. */
const PRELUDIO = `
create schema if not exists auth;
create table if not exists auth.users (id uuid primary key, email text);
create or replace function auth.uid() returns uuid language sql stable as $fn$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$fn$;
do $do$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated; end if;
end $do$;
`;

const db = new PGlite({ extensions: { pgcrypto, btree_gist } });
let tudoOk = true;

const titulo = (t) => console.log(`\n${t}`);

async function rodar(rotulo, sql) {
  try {
    await db.exec(sql);
    console.log(`  ok    ${rotulo}`);
    return true;
  } catch (e) {
    console.log(`  FALHA ${rotulo}`);
    console.log(`        ${String(e.message).split("\n").join("\n        ")}`);
    tudoOk = false;
    return false;
  }
}

/** Espera que o banco RECUSE. É assim que se testa restrição. */
async function recusa(rotulo, sql) {
  try {
    await db.exec(sql);
    console.log(`  FALHA ${rotulo}: o banco aceitou, e não deveria`);
    tudoOk = false;
  } catch {
    console.log(`  ok    ${rotulo}`);
  }
}

async function aceita(rotulo, sql) {
  try {
    await db.exec(sql);
    console.log(`  ok    ${rotulo}`);
  } catch (e) {
    console.log(`  FALHA ${rotulo}: ${e.message}`);
    tudoOk = false;
  }
}

async function confere(rotulo, sql, esperado) {
  const r = await db.query(sql);
  const v = Object.values(r.rows[0])[0];
  const bate = String(v) === String(esperado);
  console.log(
    `  ${bate ? "ok   " : "FALHA"} ${rotulo}: ${v}${bate ? "" : ` — esperado ${esperado}`}`,
  );
  if (!bate) tudoOk = false;
}

/* ------------------------------ execução ------------------------------ */

titulo("Banco limpo");
await rodar("stubs de auth e papéis do Supabase", PRELUDIO);

titulo("Migrações, em ordem");
for (const arquivo of readdirSync(PASTA).filter((f) => f.endsWith(".sql")).sort()) {
  if (!(await rodar(arquivo, readFileSync(join(PASTA, arquivo), "utf8")))) {
    console.log("\n✖ Migração falhou num banco limpo. Nada além disso importa.\n");
    process.exit(1);
  }
}

titulo("Estrutura");
await confere(
  "toda tabela pública com RLS ligada (contagem das que ficaram sem)",
  `select count(*) from pg_tables t where schemaname='public'
     and not exists (select 1 from pg_class c
                     where c.relname = t.tablename and c.relrowsecurity)`,
  0,
);
await confere(
  "views com security_invoker — sem isso, view vira porta dos fundos",
  `select count(*) from pg_class where relkind='v'
     and relnamespace='public'::regnamespace
     and coalesce(array_to_string(reloptions,','),'') like '%security_invoker=%'`,
  3,
);
await confere(
  "funções com search_path fixo (contagem das que ficaram sem)",
  // Só as nossas: as das extensões (pgcrypto, btree_gist) ficam de fora.
  `select count(*) from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proconfig is null
      and not exists (select 1 from pg_depend d
                      where d.objid = p.oid and d.deptype = 'e')`,
  0,
);

const conta = async (t) =>
  (await db.query(`select count(*)::int as n from ${t}`)).rows[0].n;
console.log(`  info  ${await conta("taxonomia_item")} itens de taxonomia`);
console.log(`  info  ${await conta("parametro")} parâmetros de política`);
console.log(`  info  ${await conta("tributo")} tributos`);

/* --------- cenário mínimo, com RLS desligada: aqui não há sessão ------- */

await db.exec(`
  alter table pessoa disable row level security;
  alter table cliente disable row level security;
  alter table oportunidade disable row level security;
  alter table revisao disable row level security;
  alter table parametro disable row level security;
  alter table custo_recurso disable row level security;

  insert into pessoa (matricula, nome, cargo_id, nivel, tipo_vinculo)
  select 'T-1','Pessoa Um', id, 2, 'Própria' from taxonomia_item where tipo='cargo' limit 1;
  insert into pessoa (matricula, nome, cargo_id, nivel, tipo_vinculo)
  select 'T-2','Pessoa Dois', id, 2, 'Própria' from taxonomia_item where tipo='cargo' limit 1;
  insert into cliente (codigo, nome) values ('CLI-T','Cliente de teste');
`);

const oportunidade = (codigo, colunas = "", valores = "") => `
  insert into oportunidade (codigo, grupo_id, cliente_id, registrado_por, origem_id,
                            tipo_solicitacao_id, objeto ${colunas})
  values ('${codigo}',
    (select id from taxonomia_item where tipo='grupo' limit 1),
    (select id from cliente where codigo='CLI-T'),
    (select id from pessoa where matricula='T-1'),
    (select id from taxonomia_item where tipo='origem_captacao' limit 1),
    (select id from taxonomia_item where tipo='tipo_solicitacao' limit 1),
    'Objeto de teste' ${valores});
`;
const p1 = "(select id from pessoa where matricula='T-1')";
const p2 = "(select id from pessoa where matricula='T-2')";

titulo("Regras duras — o banco recusa, não a aplicação");

await aceita("estágio 0 dispensa qualificação", oportunidade("OP-T-1", ", estagio", ", 0"));
await recusa(
  "regra 2 · estágio 1 com uma assinatura só",
  oportunidade("OP-T-2", ", estagio, qualificado_por_1", `, 1, ${p1}`),
);
await recusa(
  "regra 2 · estágio 1 com a mesma pessoa duas vezes",
  oportunidade("OP-T-3", ", estagio, qualificado_por_1, qualificado_por_2", `, 1, ${p1}, ${p1}`),
);
await aceita(
  "regra 2 · estágio 1 com duas pessoas distintas",
  oportunidade("OP-T-4", ", estagio, qualificado_por_1, qualificado_por_2", `, 1, ${p1}, ${p2}`),
);
await recusa(
  "regra 3 · perda sem motivo",
  oportunidade("OP-T-5", ", estagio, qualificado_por_1, qualificado_por_2", `, 6, ${p1}, ${p2}`),
);
await recusa(
  "regra 3 · No-Go sem motivo",
  oportunidade("OP-T-6", ", estagio, qualificado_por_1, qualificado_por_2", `, 8, ${p1}, ${p2}`),
);

await db.exec(`
  insert into revisao (oportunidade_id, numero, data_emissao, status)
  values ((select id from oportunidade where codigo='OP-T-4'), 0, '2026-05-01','vigente');
`);
await recusa(
  "regra 10 · duas revisões vigentes na mesma oportunidade",
  `insert into revisao (oportunidade_id, numero, data_emissao, status)
   values ((select id from oportunidade where codigo='OP-T-4'), 1, '2026-06-01','vigente');`,
);

await recusa(
  "regra 11 · vigências de custo sobrepostas",
  `insert into custo_recurso (funcao_id, nivel, valor_hora, vigencia_inicio, vigencia_fim)
   select id, 1, 10, '2026-01-01', '2026-12-31' from taxonomia_item where tipo='funcao' limit 1;
   insert into custo_recurso (funcao_id, nivel, valor_hora, vigencia_inicio, vigencia_fim)
   select id, 1, 20, '2026-06-01', '2027-06-01' from taxonomia_item where tipo='funcao' limit 1;`,
);
await recusa(
  "regra 11 · vigências de parâmetro sobrepostas",
  `insert into parametro (chave, valor, vigencia_inicio, vigencia_fim)
     values ('teste_sobrepoe', 1, '2026-01-01','2026-12-31');
   insert into parametro (chave, valor, vigencia_inicio, vigencia_fim)
     values ('teste_sobrepoe', 2, '2026-06-01','2027-06-01');`,
);

await db.exec(`
  insert into apontamento (pessoa_id, data, projeto_id, horas)
  values (${p1}, '2026-06-01', null, 8);
`).catch(() => {});
await recusa(
  "apontamento sem destino (nem projeto, nem atividade)",
  `insert into apontamento (pessoa_id, data, horas) values (${p1}, '2026-06-02', 8);`,
);

titulo("Vigência de parâmetro");
await db.exec(`
  insert into parametro (chave, valor, descricao, vigencia_inicio)
  values ('teste_reajuste', 0.15, 'antes', '2026-01-01');
  select reajustar_parametro('teste_reajuste', 0.18, '2026-07-01', null);
`);
const linhas = (
  await db.query(`select valor::float8 as valor, vigencia_inicio::text as inicio,
                         vigencia_fim::text as fim
                  from parametro where chave='teste_reajuste' order by vigencia_inicio`)
).rows;
const fechouCerto =
  linhas.length === 2 &&
  linhas[0].valor === 0.15 &&
  linhas[0].fim === "2026-06-30" &&
  linhas[1].valor === 0.18;
console.log(
  `  ${fechouCerto ? "ok   " : "FALHA"} reajuste fecha a vigência anterior em vez de sobrescrever`,
);
for (const l of linhas) console.log(`        ${l.valor} · ${l.inicio} a ${l.fim}`);
if (!fechouCerto) tudoOk = false;

await recusa(
  "reajuste retroativo (reescreveria orçamento já fechado)",
  "select reajustar_parametro('teste_reajuste', 0.2, '2026-03-01', null);",
);
await confere("param() em 15/03/2026", "select param('teste_reajuste','2026-03-15')::float8", 0.15);
await confere("param() em 15/09/2026", "select param('teste_reajuste','2026-09-15')::float8", 0.18);

titulo("Fórmulas do CLAUDE.md contra a BASE_CUSTOS_MEDICOES (projeto I-0245)");
const f = (
  await db.query(`
    select
      142060 / (1 - 0.15 - carga_tributaria(null,'2026-06-01')) + 42000*1.28 as preco_minimo,
      142060 * 1.40 + 42000 * 1.28                                          as preco_sugerido,
      203520 - 142060 - 203520 * carga_tributaria(null,'2026-06-01')        as margem_prevista,
      (203520 - 142060 - 203520 * carga_tributaria(null,'2026-06-01')) / 203520 as margem_pct
  `)
).rows[0];
const brl = (v) =>
  Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
console.log(`  info  preço sugerido          ${brl(f.preco_sugerido)}`);
console.log(`  info  preço mínimo autorizado ${brl(f.preco_minimo)}  (vendido: ${brl(257280)})`);
console.log(`  info  margem prevista         ${brl(f.margem_prevista)}`);
await confere(
  "margem prevista bate com a planilha",
  `select round((203520 - 142060 - 203520 * carga_tributaria(null,'2026-06-01'))::numeric, 2)`,
  "24826.40",
);
await confere(
  "margem prevista em % bate com a planilha (12,2%)",
  `select round(((203520 - 142060 - 203520 * carga_tributaria(null,'2026-06-01')) / 203520)::numeric, 4)`,
  "0.1220",
);
console.log(
  `  info  o preço mínimo ficou ACIMA do vendido — é exatamente o alerta\n` +
    `        "VENDIDO abaixo da margem mínima" da planilha. A fórmula com a\n` +
    `        carga tributária no denominador reproduz isso; a errada, não.`,
);

console.log(tudoOk ? "\n✓ Migrações válidas num banco limpo.\n" : "\n✖ Há falhas acima.\n");
process.exit(tudoOk ? 0 : 1);
