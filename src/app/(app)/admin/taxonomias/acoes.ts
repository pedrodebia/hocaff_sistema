"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { clienteServidor } from "@/lib/supabase/servidor";
import { TIPOS_TAXONOMIA } from "@/lib/taxonomias";

export type EstadoForm = { erro?: string; ok?: string };

const Item = z.object({
  tipo: z.enum(TIPOS_TAXONOMIA),
  codigo: z
    .string()
    .trim()
    .min(1, "Informe o código.")
    .max(40, "Código muito longo.")
    .regex(/^[A-Za-z0-9._-]+$/, "Use só letras, números, ponto, hífen e sublinhado."),
  rotulo: z.string().trim().min(1, "Informe o rótulo.").max(160, "Rótulo muito longo."),
  ordem: z.coerce.number().int().min(0).max(32767),
  funcao_id: z.string().uuid().optional().nullable(),
});

function ler(dados: FormData) {
  return Item.safeParse({
    tipo: dados.get("tipo"),
    codigo: dados.get("codigo"),
    rotulo: dados.get("rotulo"),
    ordem: dados.get("ordem") || 0,
    funcao_id: (dados.get("funcao_id") as string) || null,
  });
}

/**
 * O erro do Postgres é técnico demais para a tela. Traduzir os dois casos
 * que realmente acontecem, e só esses — mascarar o resto esconde defeito.
 */
function mensagem(codigo: string | undefined, bruto: string) {
  if (codigo === "23505") return "Já existe um item com esse código neste tipo.";
  if (codigo === "42501" || codigo === "PGRST301")
    return "Seu papel não pode alterar taxonomias. Só a Diretoria pode.";
  return bruto;
}

export async function criarItem(
  _anterior: EstadoForm,
  dados: FormData,
): Promise<EstadoForm> {
  const lido = ler(dados);
  if (!lido.success) return { erro: lido.error.issues[0].message };

  const { tipo, codigo, rotulo, ordem, funcao_id } = lido.data;

  const supabase = await clienteServidor();
  const { error } = await supabase.from("taxonomia_item").insert({
    tipo,
    codigo,
    rotulo,
    ordem,
    extra: tipo === "cargo" && funcao_id ? { funcao_id } : {},
  });

  if (error) return { erro: mensagem(error.code, error.message) };

  revalidatePath(`/admin/taxonomias/${tipo}`);
  revalidatePath("/admin/taxonomias");
  return { ok: `“${rotulo}” incluído.` };
}

export async function atualizarItem(
  _anterior: EstadoForm,
  dados: FormData,
): Promise<EstadoForm> {
  const id = String(dados.get("id") ?? "");
  if (!id) return { erro: "Item não identificado." };

  const lido = ler(dados);
  if (!lido.success) return { erro: lido.error.issues[0].message };

  const { tipo, codigo, rotulo, ordem, funcao_id } = lido.data;

  const supabase = await clienteServidor();
  const { error, count } = await supabase
    .from("taxonomia_item")
    .update(
      {
        codigo,
        rotulo,
        ordem,
        ...(tipo === "cargo" ? { extra: funcao_id ? { funcao_id } : {} } : {}),
      },
      { count: "exact" },
    )
    .eq("id", id);

  if (error) return { erro: mensagem(error.code, error.message) };
  // A RLS não recusa: ela filtra. Zero linha afetada é a recusa.
  if (!count) return { erro: "Nada foi alterado. Seu papel não pode editar taxonomias." };

  revalidatePath(`/admin/taxonomias/${tipo}`);
  return { ok: `“${rotulo}” atualizado.` };
}

/**
 * Nada é excluído. Item desativado some dos seletores e continua honrando os
 * registros históricos que apontam para ele.
 */
export async function alternarAtivo(
  _anterior: EstadoForm,
  dados: FormData,
): Promise<EstadoForm> {
  const id = String(dados.get("id") ?? "");
  const tipo = String(dados.get("tipo") ?? "");
  const ativo = dados.get("ativo") === "true";

  if (!id) return { erro: "Item não identificado." };

  const supabase = await clienteServidor();
  const { error, count } = await supabase
    .from("taxonomia_item")
    .update({ ativo: !ativo }, { count: "exact" })
    .eq("id", id);

  if (error) return { erro: mensagem(error.code, error.message) };
  if (!count) return { erro: "Nada foi alterado. Seu papel não pode editar taxonomias." };

  revalidatePath(`/admin/taxonomias/${tipo}`);
  return { ok: ativo ? "Item desativado." : "Item reativado." };
}
