/**
 * Aplicador de migrações.
 *
 *   npm run db:aplicar          aplica o que ainda não foi aplicado
 *   npm run db:aplicar -- --lista   só mostra o estado
 *
 * Não depende do Supabase CLI nem de Docker: conversa direto com o Postgres
 * pela DATABASE_URL.
 *
 * Cada arquivo roda dentro de uma transação e fica registrado em
 * `_migracao_aplicada`, com o hash do conteúdo. Se um arquivo já aplicado for
 * editado, o hash muda e o aplicador para — porque migração aplicada não se
 * edita: corrigiu, cria uma nova.
 */

import { readdirSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { config } from "dotenv";
import { Client } from "pg";

config({ path: ".env.local", quiet: true });

const PASTA = join(process.cwd(), "supabase", "migrations");
const URL = process.env.DATABASE_URL;

if (!URL) {
  console.error(
    "\n✖ Falta DATABASE_URL em .env.local.\n" +
      "  Supabase → Project Settings → Database → Connection string → URI\n",
  );
  process.exit(1);
}

const hash = (s: string) => createHash("sha256").update(s).digest("hex").slice(0, 16);

async function principal() {
  const somenteListar = process.argv.includes("--lista");

  const arquivos = readdirSync(PASTA)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const db = new Client({
    connectionString: URL,
    ssl: URL!.includes("localhost") ? undefined : { rejectUnauthorized: false },
  });
  await db.connect();

  await db.query(`
    create table if not exists _migracao_aplicada (
      arquivo     text primary key,
      hash        text not null,
      aplicada_em timestamptz not null default now()
    )
  `);

  const { rows } = await db.query<{ arquivo: string; hash: string }>(
    "select arquivo, hash from _migracao_aplicada",
  );
  const aplicadas = new Map(rows.map((r) => [r.arquivo, r.hash]));

  let novas = 0;

  for (const arquivo of arquivos) {
    const sql = readFileSync(join(PASTA, arquivo), "utf8");
    const h = hash(sql);
    const anterior = aplicadas.get(arquivo);

    if (anterior === h) {
      console.log(`  · ${arquivo} — já aplicada`);
      continue;
    }

    if (anterior && anterior !== h) {
      console.error(
        `\n✖ ${arquivo} mudou depois de aplicada.\n` +
          `  Migração aplicada nunca é editada. Reverta o arquivo e crie uma nova.\n`,
      );
      await db.end();
      process.exit(1);
    }

    if (somenteListar) {
      console.log(`  + ${arquivo} — pendente`);
      novas++;
      continue;
    }

    process.stdout.write(`  + ${arquivo} … `);
    try {
      await db.query("begin");
      await db.query(sql);
      await db.query(
        "insert into _migracao_aplicada (arquivo, hash) values ($1, $2)",
        [arquivo, h],
      );
      await db.query("commit");
      console.log("ok");
      novas++;
    } catch (e) {
      await db.query("rollback");
      console.log("falhou");
      console.error(`\n✖ ${arquivo}: ${(e as Error).message}\n`);
      await db.end();
      process.exit(1);
    }
  }

  await db.end();

  if (somenteListar) {
    console.log(`\n${novas} migração(ões) pendente(s).\n`);
  } else {
    console.log(
      novas
        ? `\n✓ ${novas} migração(ões) aplicada(s).\n`
        : "\n✓ Nada a aplicar — o banco já está em dia.\n",
    );
  }
}

principal().catch((e) => {
  console.error(e);
  process.exit(1);
});
