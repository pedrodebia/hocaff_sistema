"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  LayoutDashboard,
  ListTree,
  ShieldCheck,
  SlidersHorizontal,
  Menu,
  X,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import { Logo } from "@/componentes/marca/logo";
import { ROTULO_PAPEL, type Papel } from "@/lib/papeis";
import type { SecaoNav } from "@/lib/navegacao";
import { cn } from "@/lib/utils";

const ICONES: Record<string, LucideIcon> = {
  LayoutDashboard,
  ListTree,
  ShieldCheck,
  SlidersHorizontal,
};

type Props = {
  secoes: SecaoNav[];
  nome: string;
  cargo: string | null;
  papeis: Papel[];
  sair: () => Promise<void>;
};

function Conteudo({ secoes, nome, cargo, papeis, sair, aoNavegar }: Props & { aoNavegar?: () => void }) {
  const caminho = usePathname();

  return (
    <div className="flex h-full flex-col bg-lateral text-lateral-foreground">
      <div className="border-b border-lateral-borda px-5 py-5">
        <Link href="/inicio" onClick={aoNavegar}>
          <Logo invertido />
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {secoes.map((secao, i) => (
          <div key={secao.titulo ?? i} className={cn(i > 0 && "mt-6")}>
            {secao.titulo && (
              <p className="mb-2 px-3 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-lateral-foreground/45">
                {secao.titulo}
              </p>
            )}
            <ul className="flex flex-col gap-0.5">
              {secao.itens.map((item) => {
                const Icone = ICONES[item.icone] ?? LayoutDashboard;
                const ativo =
                  caminho === item.href || caminho.startsWith(`${item.href}/`);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={aoNavegar}
                      aria-current={ativo ? "page" : undefined}
                      className={cn(
                        "flex items-start gap-3 rounded-[var(--radius)] px-3 py-2.5 text-sm transition-colors",
                        ativo
                          ? "bg-lateral-ativo font-medium text-white"
                          : "text-lateral-foreground/85 hover:bg-lateral-ativo/60 hover:text-white",
                      )}
                    >
                      <Icone
                        className={cn(
                          "mt-0.5 size-4 shrink-0",
                          ativo ? "text-marca-verde-claro" : "text-lateral-foreground/60",
                        )}
                      />
                      <span className="flex flex-col gap-0.5">
                        {item.titulo}
                        {item.descricao && (
                          <span className="text-xs leading-snug text-lateral-foreground/45">
                            {item.descricao}
                          </span>
                        )}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-lateral-borda p-4">
        <p className="truncate text-sm font-medium text-white">{nome}</p>
        <p className="truncate text-xs text-lateral-foreground/60">{cargo ?? "—"}</p>

        {papeis.length > 0 && (
          <ul className="mt-2.5 flex flex-wrap gap-1">
            {papeis.map((p) => (
              <li
                key={p}
                title={ROTULO_PAPEL[p]}
                className="rounded-full bg-marca-verde/18 px-2 py-0.5 text-[0.65rem] font-semibold tracking-wide text-marca-verde-claro"
              >
                {p}
              </li>
            ))}
          </ul>
        )}

        <form action={sair}>
          <button
            type="submit"
            className="mt-4 flex w-full items-center gap-2 rounded-[var(--radius)] px-2 py-2 text-sm text-lateral-foreground/70 transition-colors hover:bg-lateral-ativo/60 hover:text-white"
          >
            <LogOut className="size-4" />
            Sair
          </button>
        </form>
      </div>
    </div>
  );
}

export function NavegacaoLateral(props: Props) {
  const [aberta, setAberta] = useState(false);

  return (
    <>
      {/* Desktop */}
      <aside className="fixed inset-y-0 left-0 hidden w-72 lg:block">
        <Conteudo {...props} />
      </aside>

      {/* Mobile */}
      <Dialog.Root open={aberta} onOpenChange={setAberta}>
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-card px-4 py-3 lg:hidden">
          <Logo compacto />
          <Dialog.Trigger asChild>
            <button
              type="button"
              aria-label="Abrir navegação"
              className="rounded-[var(--radius)] p-2 text-marca-azul hover:bg-muted"
            >
              <Menu className="size-5" />
            </button>
          </Dialog.Trigger>
        </header>

        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-marca-grafite/50 lg:hidden" />
          <Dialog.Content className="fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] shadow-2xl outline-none lg:hidden">
            <Dialog.Title className="sr-only">Navegação</Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Fechar navegação"
                className="absolute right-3 top-4 z-10 rounded p-1.5 text-lateral-foreground hover:bg-lateral-ativo"
              >
                <X className="size-5" />
              </button>
            </Dialog.Close>
            <Conteudo {...props} aoNavegar={() => setAberta(false)} />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
