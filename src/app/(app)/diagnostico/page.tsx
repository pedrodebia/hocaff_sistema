import type { Metadata } from "next";
import { Check, Minus, TriangleAlert } from "lucide-react";
import { sessaoAtual } from "@/lib/sessao";
import { podeVerRestrito } from "@/lib/papeis";
import { clienteServidor } from "@/lib/supabase/servidor";
import { CabecalhoPagina } from "@/componentes/cabecalho-pagina";
import {
  Aviso,
  Badge,
  Tabela,
  TCabecalho,
  TCabecaCelula,
  TCorpo,
  TLinha,
  TCelula,
} from "@/componentes/ui/primitivos";

export const metadata: Metadata = { title: "Diagnóstico de acesso" };
export const dynamic = "force-dynamic";

type Sonda = {
  relacao: string;
  descricao: string;
  classe: "aberta" | "restrita" | "propria";
};

const SONDAS: Sonda[] = [
  { relacao: "taxonomia_item", descricao: "Listas do sistema", classe: "aberta" },
  { relacao: "parametro", descricao: "Parâmetros de política", classe: "aberta" },
  { relacao: "pessoa", descricao: "Cadastro de profissionais", classe: "aberta" },
  { relacao: "projeto", descricao: "Portfólio, sem custo nem margem", classe: "aberta" },
  { relacao: "medicao_fisica", descricao: "Avanço físico atestado", classe: "aberta" },
  { relacao: "apontamento", descricao: "Horas — cada um só as suas", classe: "propria" },
  { relacao: "custo_recurso", descricao: "Custo horário por função e nível", classe: "restrita" },
  { relacao: "tributo", descricao: "Alíquotas vigentes", classe: "restrita" },
  { relacao: "revisao_economico", descricao: "Custo, BDI e margem da proposta", classe: "restrita" },
  { relacao: "projeto_economico", descricao: "Orçado do contrato", classe: "restrita" },
  { relacao: "medicao_financeira", descricao: "Medição convertida em valor", classe: "restrita" },
  { relacao: "faturamento", descricao: "NF e recebimento", classe: "restrita" },
  { relacao: "receita_evento", descricao: "Fluxo de receita", classe: "restrita" },
  { relacao: "despesa_evento", descricao: "Fluxo de despesa", classe: "restrita" },
  { relacao: "v_custo_realizado", descricao: "Custo realizado por mês (view)", classe: "restrita" },
];

export default async function PaginaDiagnostico() {
  const sessao = await sessaoAtual();
  if (!sessao?.pessoa) return null;

  const supabase = await clienteServidor();
  const restrito = podeVerRestrito(sessao.papeis);

  const linhas = await Promise.all(
    SONDAS.map(async (s) => {
      const { count, error } = await supabase
        .from(s.relacao)
        .select("*", { count: "exact", head: true });

      const lidas = error ? 0 : (count ?? 0);
      const deveriaLer = s.classe === "restrita" ? restrito : true;
      // Zero linha numa relação vazia não prova nada, mas ler onde não se
      // deveria ler é sempre falha.
      const falha = !deveriaLer && lidas > 0;

      return { ...s, lidas, erro: error?.message ?? null, deveriaLer, falha };
    }),
  );

  const falhas = linhas.filter((l) => l.falha).length;

  return (
    <>
      <CabecalhoPagina
        titulo="Diagnóstico de acesso"
        descricao="O que a sua sessão consegue ler agora, consultado ao vivo. Estes números vêm do banco com as suas credenciais — nenhuma checagem acontece nesta página."
      />

      <div className="mb-6">
        {falhas === 0 ? (
          <Aviso tom="acento" titulo="Modelo de confidencialidade íntegro">
            Nenhuma relação restrita devolveu linha fora do seu direito de acesso.
            {!restrito && " Custo, margem e faturamento não chegam à sua sessão."}
          </Aviso>
        ) : (
          <Aviso tom="perigo" titulo={`${falhas} relação(ões) devolveram dado indevido`}>
            Uma policy está frouxa. Rode <code>npm run teste:rls</code> e corrija antes
            de seguir.
          </Aviso>
        )}
      </div>

      <Tabela>
        <TCabecalho>
          <tr>
            <TCabecaCelula>Relação</TCabecaCelula>
            <TCabecaCelula>Classificação</TCabecaCelula>
            <TCabecaCelula className="text-right">Linhas lidas</TCabecaCelula>
            <TCabecaCelula>Situação</TCabecaCelula>
          </tr>
        </TCabecalho>
        <TCorpo>
          {linhas.map((l) => (
            <TLinha key={l.relacao}>
              <TCelula>
                <span className="font-mono text-[0.8rem] text-marca-azul">{l.relacao}</span>
                <span className="block text-xs text-muted-foreground">{l.descricao}</span>
              </TCelula>
              <TCelula>
                {l.classe === "restrita" && <Badge tom="perigo">Restrita</Badge>}
                {l.classe === "aberta" && <Badge tom="neutro">Aberta</Badge>}
                {l.classe === "propria" && <Badge tom="marca">Só as suas</Badge>}
              </TCelula>
              <TCelula className="text-right font-mono tabular-nums">{l.lidas}</TCelula>
              <TCelula>
                {l.falha ? (
                  <span className="inline-flex items-center gap-1.5 text-destructive">
                    <TriangleAlert className="size-4" /> Vazamento
                  </span>
                ) : l.deveriaLer ? (
                  <span className="inline-flex items-center gap-1.5 text-accent">
                    <Check className="size-4" /> Leitura permitida
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                    <Minus className="size-4" /> Bloqueada pela RLS
                  </span>
                )}
              </TCelula>
            </TLinha>
          ))}
        </TCorpo>
      </Tabela>

      <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
        Uma relação restrita não devolve erro de permissão: ela devolve zero linha.
        É assim que a Row Level Security funciona — a policy filtra a consulta em vez
        de recusá-la. Do lado de fora, o dado simplesmente não existe.
      </p>
    </>
  );
}
