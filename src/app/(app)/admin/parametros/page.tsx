import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { sessaoAtual } from "@/lib/sessao";
import { temPapel } from "@/lib/papeis";
import { clienteServidor } from "@/lib/supabase/servidor";
import { CabecalhoPagina } from "@/componentes/cabecalho-pagina";
import { Aviso } from "@/componentes/ui/primitivos";
import {
  EditorParametros,
  type GrupoParametro,
  type LinhaParametro,
} from "./editor";

export const metadata: Metadata = { title: "Parâmetros" };
export const dynamic = "force-dynamic";

export default async function PaginaParametros() {
  const sessao = await sessaoAtual();
  if (!sessao?.pessoa) redirect("/entrar");

  const supabase = await clienteServidor();
  const { data } = await supabase
    .from("parametro")
    .select("id, chave, valor, descricao, vigencia_inicio, vigencia_fim")
    .order("chave")
    .order("vigencia_inicio", { ascending: false });

  const hoje = new Date().toISOString().slice(0, 10);

  const porChave = new Map<string, LinhaParametro[]>();
  for (const bruto of data ?? []) {
    const linha: LinhaParametro = { ...bruto, valor: Number(bruto.valor) };
    const lista = porChave.get(linha.chave) ?? [];
    lista.push(linha);
    porChave.set(linha.chave, lista);
  }

  const grupos: GrupoParametro[] = [...porChave.entries()].map(([chave, linhas]) => {
    const vigente =
      linhas.find(
        (l) => l.vigencia_inicio <= hoje && l.vigencia_fim >= hoje,
      ) ?? null;
    return {
      chave,
      descricao: vigente?.descricao ?? linhas[0]?.descricao ?? null,
      vigente,
      historico: linhas.filter((l) => l.id !== vigente?.id),
    };
  });

  const podeEditar = temPapel(sessao.papeis, "DE", "DT");

  return (
    <>
      <CabecalhoPagina
        titulo="Parâmetros de política"
        descricao="Margens, alçadas, limites de faixa, probabilidades do funil e prazos. Cada valor tem vigência: reajustar abre linha nova em vez de sobrescrever, para que a comparação realizado × orçado continue válida."
      />

      {!podeEditar && (
        <Aviso tom="alerta" className="mb-6" titulo="Somente leitura">
          Alterar parâmetro é atribuição da Diretoria (papéis DE e DT).
        </Aviso>
      )}

      <EditorParametros grupos={grupos} podeEditar={podeEditar} hoje={hoje} />
    </>
  );
}
