"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { clienteServidor } from "@/lib/supabase/servidor";

export type EstadoEntrada = { erro?: string; aviso?: string };

function destinoSeguro(bruto: FormDataEntryValue | null) {
  const v = typeof bruto === "string" ? bruto : "";
  // Só caminho interno. Evita virar redirecionador aberto.
  return v.startsWith("/") && !v.startsWith("//") ? v : "/inicio";
}

export async function entrarComSenha(
  _anterior: EstadoEntrada,
  dados: FormData,
): Promise<EstadoEntrada> {
  const email = String(dados.get("email") ?? "").trim().toLowerCase();
  const senha = String(dados.get("senha") ?? "");
  const proxima = destinoSeguro(dados.get("proxima"));

  if (!email || !senha) return { erro: "Informe e-mail e senha." };

  const supabase = await clienteServidor();
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha });

  if (error) {
    return { erro: "E-mail ou senha não conferem." };
  }

  revalidatePath("/", "layout");
  redirect(proxima);
}

export async function enviarLink(
  _anterior: EstadoEntrada,
  dados: FormData,
): Promise<EstadoEntrada> {
  const email = String(dados.get("email") ?? "").trim().toLowerCase();
  const proxima = destinoSeguro(dados.get("proxima"));

  if (!email) return { erro: "Informe o e-mail corporativo." };

  const cabecalhos = await headers();
  const origem =
    process.env.NEXT_PUBLIC_SITE_URL ??
    `${cabecalhos.get("x-forwarded-proto") ?? "http"}://${cabecalhos.get("host")}`;

  const supabase = await clienteServidor();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      // Ninguém se cadastra sozinho: a pessoa precisa existir no cadastro.
      shouldCreateUser: false,
      emailRedirectTo: `${origem}/auth/confirmar?proxima=${encodeURIComponent(proxima)}`,
    },
  });

  if (error) {
    return { erro: "Não foi possível enviar o link. Confira o e-mail e tente de novo." };
  }

  return { aviso: `Link enviado para ${email}. Ele vale por uma hora.` };
}

export async function sair() {
  const supabase = await clienteServidor();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/entrar");
}
