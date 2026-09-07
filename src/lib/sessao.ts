import { cache } from "react";
import { clienteServidor } from "@/lib/supabase/servidor";
import { PAPEIS, type Papel } from "@/lib/papeis";

export type PessoaSessao = {
  id: string;
  matricula: string;
  nome: string;
  email: string | null;
  nivel: number;
  tipo_vinculo: string;
  cargo: string | null;
};

export type Sessao = {
  authUserId: string;
  email: string | null;
  /** Nulo quando o usuário autenticou mas não há linha em `pessoa` ligada a ele. */
  pessoa: PessoaSessao | null;
  papeis: Papel[];
};

/**
 * Quem está logado, com a linha de `pessoa` e os papéis.
 *
 * `cache` do React memoriza por requisição: o layout, a navegação e a página
 * chamam à vontade e o banco é consultado uma vez só.
 */
export const sessaoAtual = cache(async (): Promise<Sessao | null> => {
  const supabase = await clienteServidor();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: pessoa } = await supabase
    .from("pessoa")
    .select("id, matricula, nome, email, nivel, tipo_vinculo, cargo:cargo_id(rotulo)")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!pessoa) {
    return { authUserId: user.id, email: user.email ?? null, pessoa: null, papeis: [] };
  }

  const { data: linhasPapel } = await supabase
    .from("pessoa_papel")
    .select("papel")
    .eq("pessoa_id", pessoa.id);

  const papeis = (linhasPapel ?? [])
    .map((l) => l.papel as string)
    .filter((p): p is Papel => (PAPEIS as readonly string[]).includes(p));

  const cargo = pessoa.cargo as unknown as { rotulo: string } | null;

  return {
    authUserId: user.id,
    email: user.email ?? null,
    pessoa: {
      id: pessoa.id,
      matricula: pessoa.matricula,
      nome: pessoa.nome,
      email: pessoa.email,
      nivel: pessoa.nivel,
      tipo_vinculo: pessoa.tipo_vinculo,
      cargo: cargo?.rotulo ?? null,
    },
    papeis,
  };
});
