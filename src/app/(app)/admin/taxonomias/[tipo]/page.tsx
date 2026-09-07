import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { sessaoAtual } from "@/lib/sessao";
import { temPapel } from "@/lib/papeis";
import { clienteServidor } from "@/lib/supabase/servidor";
import { ROTULO_TIPO, ehTipoTaxonomia } from "@/lib/taxonomias";
import { CabecalhoPagina } from "@/componentes/cabecalho-pagina";
import { Aviso } from "@/componentes/ui/primitivos";
import { EditorTaxonomia, type ItemTaxonomia, type OpcaoFuncao } from "./editor";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/admin/taxonomias/[tipo]">): Promise<Metadata> {
  const { tipo } = await params;
  return { title: ehTipoTaxonomia(tipo) ? ROTULO_TIPO[tipo] : "Taxonomia" };
}

export default async function PaginaTipo({
  params,
}: PageProps<"/admin/taxonomias/[tipo]">) {
  const { tipo } = await params;
  if (!ehTipoTaxonomia(tipo)) notFound();

  const sessao = await sessaoAtual();
  if (!sessao?.pessoa) redirect("/entrar");

  const supabase = await clienteServidor();

  const [{ data: itens }, { data: funcoes }] = await Promise.all([
    supabase
      .from("taxonomia_item")
      .select("id, codigo, rotulo, ordem, ativo, extra")
      .eq("tipo", tipo)
      .order("ordem")
      .order("rotulo"),
    // Só o tipo `cargo` precisa apontar para uma função.
    tipo === "cargo"
      ? supabase
          .from("taxonomia_item")
          .select("id, rotulo")
          .eq("tipo", "funcao")
          .eq("ativo", true)
          .order("ordem")
      : Promise.resolve({ data: [] as OpcaoFuncao[] }),
  ]);

  const podeEditar = temPapel(sessao.papeis, "DE", "DT");

  return (
    <>
      <Link
        href="/admin/taxonomias"
        className="mb-5 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-accent"
      >
        <ArrowLeft className="size-4" />
        Todas as taxonomias
      </Link>

      <CabecalhoPagina
        titulo={ROTULO_TIPO[tipo]}
        descricao={`Tipo “${tipo}”. Itens inativos somem dos seletores e continuam válidos para os registros antigos que apontam para eles.`}
      />

      {!podeEditar && (
        <Aviso tom="alerta" className="mb-6" titulo="Somente leitura">
          Alterar taxonomia é atribuição da Diretoria (papéis DE e DT).
        </Aviso>
      )}

      <EditorTaxonomia
        tipo={tipo}
        rotuloTipo={ROTULO_TIPO[tipo]}
        itens={(itens ?? []) as ItemTaxonomia[]}
        funcoes={(funcoes ?? []) as OpcaoFuncao[]}
        podeEditar={podeEditar}
      />
    </>
  );
}
