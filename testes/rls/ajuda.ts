import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { PapelSistema } from "../../supabase/seed/dados";

export const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
export const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
export const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!URL || !ANON || !SERVICE) {
  throw new Error(
    "Testes de RLS precisam de NEXT_PUBLIC_SUPABASE_URL, " +
      "NEXT_PUBLIC_SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY em .env.local",
  );
}

/** Ignora RLS. Só para montar e desmontar o cenário. */
export const admin: SupabaseClient = createClient(URL, SERVICE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export const TODOS_OS_PAPEIS: PapelSistema[] = [
  "CNN", "DT", "DE", "GPR", "CPR", "LT", "GCM", "ADM",
];

/** Espelho de `pode_ver_restrito()`. Se divergir do banco, o teste acusa. */
export const PAPEIS_RESTRITO: PapelSistema[] = ["GCM", "DE", "DT"];

export const RELACOES_RESTRITAS = [
  "custo_recurso",
  "tributo",
  "revisao_economico",
  "projeto_economico",
  "medicao_financeira",
  "faturamento",
  "receita_evento",
  "despesa_evento",
  "v_custo_realizado",
] as const;

export const RELACOES_ABERTAS = [
  "taxonomia_item",
  "parametro",
  "pessoa",
  "cliente",
  "oportunidade",
  "revisao",
  "revisao_hh",
  "projeto",
  "projeto_hh_baseline",
  "medicao_fisica",
] as const;

export type Ator = {
  email: string;
  pessoaId: string;
  authId: string;
  papeis: PapelSistema[];
  /** Cliente autenticado como esta pessoa: enxerga só o que a RLS permitir. */
  db: SupabaseClient;
};

const SENHA = "Teste@RLS2026";
let contador = 0;

async function umCargo(): Promise<string> {
  const { data, error } = await admin
    .from("taxonomia_item")
    .select("id")
    .eq("tipo", "cargo")
    .limit(1)
    .single();
  if (error) throw new Error(`Sem taxonomia de cargo: ${error.message}. Aplique as migrações.`);
  return data.id;
}

/**
 * Cria uma pessoa descartável com os papéis pedidos e devolve um cliente
 * autenticado como ela. Nada de mock: é sessão de verdade contra o banco.
 */
export async function criarAtor(papeis: PapelSistema[]): Promise<Ator> {
  const marca = `${Date.now().toString(36)}${(contador++).toString(36)}`;
  const email = `rls-${marca}@hocaff.test`;

  const { data: conta, error: erroConta } = await admin.auth.admin.createUser({
    email,
    password: SENHA,
    email_confirm: true,
  });
  if (erroConta) throw new Error(`criar conta: ${erroConta.message}`);

  const { data: pessoa, error: erroPessoa } = await admin
    .from("pessoa")
    .insert({
      matricula: `RLS-${marca}`,
      nome: `Ator de teste ${papeis.join("+") || "sem papel"}`,
      email,
      auth_user_id: conta.user.id,
      cargo_id: await umCargo(),
      nivel: 2,
      tipo_vinculo: "Própria",
    })
    .select("id")
    .single();
  if (erroPessoa) throw new Error(`criar pessoa: ${erroPessoa.message}`);

  if (papeis.length) {
    const { error } = await admin
      .from("pessoa_papel")
      .insert(papeis.map((papel) => ({ pessoa_id: pessoa.id, papel })));
    if (error) throw new Error(`atribuir papéis: ${error.message}`);
  }

  const db = createClient(URL, ANON, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error: erroLogin } = await db.auth.signInWithPassword({
    email,
    password: SENHA,
  });
  if (erroLogin) throw new Error(`entrar como ${email}: ${erroLogin.message}`);

  return { email, pessoaId: pessoa.id, authId: conta.user.id, papeis, db };
}

export async function removerAtor(ator: Ator) {
  await admin.from("apontamento").delete().eq("pessoa_id", ator.pessoaId);
  await admin.from("pessoa").delete().eq("id", ator.pessoaId);
  await admin.auth.admin.deleteUser(ator.authId);
}

/** Quantas linhas esta sessão consegue ler nesta relação. */
export async function contar(db: SupabaseClient, relacao: string) {
  const { count, error } = await db
    .from(relacao)
    .select("*", { count: "exact", head: true });
  return { linhas: error ? 0 : (count ?? 0), erro: error?.message ?? null };
}

/** Conta ignorando RLS — para saber se a relação tem dado a ser protegido. */
export async function contarComoAdmin(relacao: string) {
  const { count } = await admin.from(relacao).select("*", { count: "exact", head: true });
  return count ?? 0;
}

export function podeVerRestrito(papeis: PapelSistema[]) {
  return papeis.some((p) => PAPEIS_RESTRITO.includes(p));
}
