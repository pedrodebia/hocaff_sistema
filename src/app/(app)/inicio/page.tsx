import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { sessaoAtual } from "@/lib/sessao";
import { navegacaoPara } from "@/lib/navegacao";
import { ROTULO_PAPEL, podeVerRestrito } from "@/lib/papeis";
import { clienteServidor } from "@/lib/supabase/servidor";
import { CabecalhoPagina } from "@/componentes/cabecalho-pagina";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
  Aviso,
} from "@/componentes/ui/primitivos";

export const metadata: Metadata = { title: "Início" };

export default async function PaginaInicio() {
  const sessao = await sessaoAtual();
  if (!sessao?.pessoa) return null;

  const supabase = await clienteServidor();

  // Contagens simples, tudo passando pela RLS da sessão.
  const [taxonomias, parametros, pessoas] = await Promise.all([
    supabase.from("taxonomia_item").select("id", { count: "exact", head: true }).eq("ativo", true),
    supabase.from("parametro").select("id", { count: "exact", head: true }),
    supabase.from("pessoa").select("id", { count: "exact", head: true }).eq("ativo", true),
  ]);

  const secoes = navegacaoPara(sessao.papeis);
  const restrito = podeVerRestrito(sessao.papeis);

  const cartoes = [
    { rotulo: "Itens de taxonomia ativos", valor: taxonomias.count ?? 0 },
    { rotulo: "Parâmetros de política", valor: parametros.count ?? 0 },
    { rotulo: "Pessoas ativas no cadastro", valor: pessoas.count ?? 0 },
  ];

  return (
    <>
      <CabecalhoPagina
        titulo={`Olá, ${sessao.pessoa.nome.split(" ")[0]}`}
        descricao="Fase 0 concluída: fundação, autenticação, navegação por papel e administração das listas e dos parâmetros. As telas de negócio chegam nas fases seguintes."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {cartoes.map((c) => (
          <Card key={c.rotulo}>
            <CardContent className="p-5">
              <p className="font-titulo text-3xl font-bold text-marca-azul">{c.valor}</p>
              <p className="mt-1 text-sm text-muted-foreground">{c.rotulo}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Seu acesso</CardTitle>
            <CardDescription>
              Matrícula {sessao.pessoa.matricula} · {sessao.pessoa.cargo ?? "sem cargo"} ·
              nível {sessao.pessoa.nivel} · {sessao.pessoa.tipo_vinculo}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {sessao.papeis.length === 0 ? (
              <Aviso tom="alerta">
                Você não tem nenhum papel atribuído. Fora as listas de leitura aberta,
                o banco não vai devolver dado nenhum.
              </Aviso>
            ) : (
              <ul className="flex flex-col gap-2">
                {sessao.papeis.map((p) => (
                  <li key={p} className="flex items-center gap-2.5 text-sm">
                    <Badge tom="marca">{p}</Badge>
                    <span className="text-muted-foreground">{ROTULO_PAPEL[p]}</span>
                  </li>
                ))}
              </ul>
            )}

            <Aviso tom={restrito ? "acento" : "neutro"}>
              {restrito ? (
                <>
                  Seu papel <strong>enxerga custo, margem e faturamento</strong>. Esse
                  dado não sai daqui em conversa de corredor nem em captura de tela.
                </>
              ) : (
                <>
                  Seu papel gere por <strong>horas</strong>. Custo, margem e faturamento
                  não são escondidos na tela — eles simplesmente não voltam do banco.
                </>
              )}
            </Aviso>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>O que está disponível para você</CardTitle>
            <CardDescription>
              O menu é montado a partir dos seus papéis.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-1">
              {secoes.flatMap((s) => s.itens).map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="group flex items-center justify-between rounded-[var(--radius)] px-3 py-2.5 text-sm transition-colors hover:bg-muted"
                  >
                    <span>
                      {item.titulo}
                      {item.descricao && (
                        <span className="block text-xs text-muted-foreground">
                          {item.descricao}
                        </span>
                      )}
                    </span>
                    <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-accent" />
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
