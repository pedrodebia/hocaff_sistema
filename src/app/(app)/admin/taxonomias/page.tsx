import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { sessaoAtual } from "@/lib/sessao";
import { temPapel } from "@/lib/papeis";
import { clienteServidor } from "@/lib/supabase/servidor";
import {
  GRUPOS_TAXONOMIA,
  ROTULO_TIPO,
  type TipoTaxonomia,
} from "@/lib/taxonomias";
import { CabecalhoPagina } from "@/componentes/cabecalho-pagina";
import { Aviso, Badge, Card } from "@/componentes/ui/primitivos";

export const metadata: Metadata = { title: "Taxonomias" };
export const dynamic = "force-dynamic";

export default async function PaginaTaxonomias() {
  const sessao = await sessaoAtual();
  if (!sessao?.pessoa) redirect("/entrar");

  const supabase = await clienteServidor();
  const { data } = await supabase.from("taxonomia_item").select("tipo, ativo");

  const contagem = new Map<string, { total: number; ativos: number }>();
  for (const item of data ?? []) {
    const c = contagem.get(item.tipo) ?? { total: 0, ativos: 0 };
    c.total += 1;
    if (item.ativo) c.ativos += 1;
    contagem.set(item.tipo, c);
  }

  const podeEditar = temPapel(sessao.papeis, "DE", "DT");

  return (
    <>
      <CabecalhoPagina
        titulo="Taxonomias"
        descricao="Toda lista do sistema mora aqui. Incluir é livre; desativar substitui excluir, porque registro histórico aponta para o item. Mudar uma lista é editar registro — nunca migração."
      />

      {!podeEditar && (
        <Aviso tom="alerta" className="mb-6" titulo="Somente leitura">
          Alterar taxonomia é atribuição da Diretoria. Você consulta, mas o banco recusa
          a escrita.
        </Aviso>
      )}

      <div className="flex flex-col gap-6">
        {GRUPOS_TAXONOMIA.map((grupo) => (
          <section key={grupo.titulo}>
            <h2 className="mb-2.5 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {grupo.titulo}
            </h2>
            <Card className="divide-y divide-border">
              {grupo.tipos.map((tipo: TipoTaxonomia) => {
                const c = contagem.get(tipo) ?? { total: 0, ativos: 0 };
                const inativos = c.total - c.ativos;
                return (
                  <Link
                    key={tipo}
                    href={`/admin/taxonomias/${tipo}`}
                    className="group flex items-center justify-between gap-4 px-5 py-3.5 transition-colors first:rounded-t-[var(--radius)] last:rounded-b-[var(--radius)] hover:bg-muted"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {ROTULO_TIPO[tipo]}
                      </p>
                      <p className="font-mono text-xs text-muted-foreground">{tipo}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2.5">
                      <Badge tom={c.ativos ? "acento" : "neutro"}>
                        {c.ativos} ativo{c.ativos === 1 ? "" : "s"}
                      </Badge>
                      {inativos > 0 && <Badge tom="neutro">{inativos} inativo</Badge>}
                      <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-accent" />
                    </div>
                  </Link>
                );
              })}
            </Card>
          </section>
        ))}
      </div>
    </>
  );
}
