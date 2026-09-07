import type { Metadata } from "next";
import { Logo } from "@/componentes/marca/logo";
import { FormularioEntrada } from "./formulario";

export const metadata: Metadata = { title: "Entrar" };

export default async function PaginaEntrar({ searchParams }: PageProps<"/entrar">) {
  const params = await searchParams;
  const bruto = params?.proxima;
  const proxima = typeof bruto === "string" && bruto.startsWith("/") ? bruto : "/inicio";

  return (
    <main className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      {/* Painel da marca */}
      <section className="relative hidden flex-col justify-between overflow-hidden bg-marca-azul-profundo p-10 text-white lg:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-marca-verde/25 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-marca-verde-claro/12 blur-3xl"
        />

        <Logo invertido />

        <div className="relative max-w-lg">
          <h1 className="font-titulo text-4xl font-extrabold leading-tight tracking-tight">
            Projetamos soluções.
            <br />
            <span className="text-marca-verde-claro">Construímos o futuro.</span>
          </h1>
          <p className="mt-5 text-base leading-relaxed text-white/70">
            Funil, propostas, portfólio, apontamento de horas, medição e resultado —
            no lugar das planilhas.
          </p>
        </div>

        <p className="relative text-xs uppercase tracking-[0.35em] text-white/45">
          Inovadora / Confiável / Precisa
        </p>
      </section>

      {/* Formulário */}
      <section className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <div className="lg:hidden">
            <Logo />
          </div>

          <h2 className="mt-8 font-titulo text-2xl font-bold text-marca-azul lg:mt-0">
            Acesso ao sistema
          </h2>
          <p className="mt-1.5 mb-7 text-sm text-muted-foreground">
            Use o seu e-mail corporativo. O acesso é liberado pela Diretoria — não há
            autocadastro.
          </p>

          <FormularioEntrada proxima={proxima} />

          <p className="mt-10 text-xs leading-relaxed text-muted-foreground">
            O que cada pessoa enxerga é decidido pelo banco de dados, a partir dos seus
            papéis. Custo, margem e faturamento só existem para Gestão de Custos e
            Medições e para a Diretoria.
          </p>
        </div>
      </section>
    </main>
  );
}
