import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { sessaoAtual } from "@/lib/sessao";
import { navegacaoPara } from "@/lib/navegacao";
import { NavegacaoLateral } from "@/componentes/navegacao-lateral";
import { Aviso } from "@/componentes/ui/primitivos";
import { Logo } from "@/componentes/marca/logo";
import { sair } from "@/app/entrar/acoes";

export default async function LayoutApp({ children }: { children: ReactNode }) {
  const sessao = await sessaoAtual();

  if (!sessao) redirect("/entrar");

  // Autenticou, mas não existe linha em `pessoa` apontando para este usuário.
  // Sem isso não há papel, não há timesheet e a RLS não tem a quem se referir.
  if (!sessao.pessoa) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-6 p-6">
        <Logo />
        <Aviso tom="alerta" titulo="Cadastro pendente">
          <p>
            A sua conta ({sessao.email}) entrou, mas ainda não está ligada a nenhuma
            pessoa do cadastro. Peça à Diretoria para vincular o seu e-mail à sua
            matrícula.
          </p>
        </Aviso>
        <form action={sair}>
          <button
            type="submit"
            className="text-sm text-muted-foreground underline-offset-4 hover:text-accent hover:underline"
          >
            Sair
          </button>
        </form>
      </main>
    );
  }

  const secoes = navegacaoPara(sessao.papeis);

  return (
    <div className="min-h-dvh lg:pl-72">
      <NavegacaoLateral
        secoes={secoes}
        nome={sessao.pessoa.nome}
        cargo={sessao.pessoa.cargo}
        papeis={sessao.papeis}
        sair={sair}
      />
      <main className="mx-auto w-full max-w-6xl p-5 sm:p-8">{children}</main>
    </div>
  );
}
