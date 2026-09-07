"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { clienteServidor } from "@/lib/supabase/servidor";

export type EstadoForm = { erro?: string; ok?: string };

const DATA = /^\d{4}-\d{2}-\d{2}$/;

const Novo = z.object({
  chave: z
    .string()
    .trim()
    .min(1, "Informe a chave.")
    .max(60)
    .regex(/^[a-z0-9_]+$/, "Use minúsculas, números e sublinhado: margem_minima_grande."),
  valor: z.coerce.number().finite("Valor inválido."),
  descricao: z.string().trim().max(240).optional(),
  vigencia_inicio: z.string().regex(DATA, "Data inválida."),
});

const Reajuste = z.object({
  chave: z.string().trim().min(1),
  valor: z.coerce.number().finite("Valor inválido."),
  vigencia_inicio: z.string().regex(DATA, "Data inválida."),
  descricao: z.string().trim().max(240).optional(),
});

function mensagem(codigo: string | undefined, bruto: string) {
  if (codigo === "23P01" || codigo === "23505")
    return "Essa vigência se sobrepõe a uma já existente para a mesma chave.";
  if (codigo === "42501" || codigo === "PGRST301")
    return "Seu papel não pode alterar parâmetros. Só a Diretoria pode.";
  return bruto;
}

export async function criarParametro(
  _anterior: EstadoForm,
  dados: FormData,
): Promise<EstadoForm> {
  const lido = Novo.safeParse({
    chave: dados.get("chave"),
    valor: dados.get("valor"),
    descricao: dados.get("descricao") || undefined,
    vigencia_inicio: dados.get("vigencia_inicio"),
  });
  if (!lido.success) return { erro: lido.error.issues[0].message };

  const supabase = await clienteServidor();
  const { error } = await supabase.from("parametro").insert(lido.data);

  if (error) return { erro: mensagem(error.code, error.message) };

  revalidatePath("/admin/parametros");
  return { ok: `Parâmetro ${lido.data.chave} criado.` };
}

/**
 * Reajuste NÃO é update do valor. Chama a função do banco, que fecha a
 * vigência corrente e abre a nova numa transação só. Ver migração 0004.
 */
export async function reajustarParametro(
  _anterior: EstadoForm,
  dados: FormData,
): Promise<EstadoForm> {
  const lido = Reajuste.safeParse({
    chave: dados.get("chave"),
    valor: dados.get("valor"),
    vigencia_inicio: dados.get("vigencia_inicio"),
    descricao: dados.get("descricao") || undefined,
  });
  if (!lido.success) return { erro: lido.error.issues[0].message };

  const supabase = await clienteServidor();
  const { error } = await supabase.rpc("reajustar_parametro", {
    p_chave: lido.data.chave,
    p_valor: lido.data.valor,
    p_inicio: lido.data.vigencia_inicio,
    p_descricao: lido.data.descricao ?? null,
  });

  if (error) return { erro: mensagem(error.code, error.message) };

  revalidatePath("/admin/parametros");
  return { ok: `${lido.data.chave} reajustado a partir de ${lido.data.vigencia_inicio}.` };
}
