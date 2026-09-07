"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import * as Dialog from "@radix-ui/react-dialog";
import { toast } from "sonner";
import { History, Plus, TrendingUp, X } from "lucide-react";
import { criarParametro, reajustarParametro, type EstadoForm } from "./acoes";
import { Button } from "@/componentes/ui/button";
import { Input, Textarea } from "@/componentes/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Label,
  Badge,
  Aviso,
} from "@/componentes/ui/primitivos";
import { numero, percentual, vigencia, VIGENCIA_ABERTA } from "@/lib/formato";

export type LinhaParametro = {
  id: string;
  chave: string;
  valor: number;
  descricao: string | null;
  vigencia_inicio: string;
  vigencia_fim: string;
};

export type GrupoParametro = {
  chave: string;
  descricao: string | null;
  vigente: LinhaParametro | null;
  historico: LinhaParametro[];
};

function useAviso(estado: EstadoForm, aoConcluir?: () => void) {
  useEffect(() => {
    if (estado.ok) {
      toast.success(estado.ok);
      aoConcluir?.();
    }
    if (estado.erro) toast.error(estado.erro);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado]);
}

function BotaoSubmeter({
  children,
  variant,
}: {
  children: React.ReactNode;
  variant?: React.ComponentProps<typeof Button>["variant"];
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} disabled={pending}>
      {pending ? "…" : children}
    </Button>
  );
}

/** Fração vira percentual só como leitura auxiliar; o banco guarda a fração. */
function ValorLido({ valor }: { valor: number }) {
  const fracionario = valor > 0 && valor < 1;
  return (
    <span className="inline-flex items-baseline gap-2">
      <span className="font-titulo text-xl font-bold tabular-nums text-marca-azul">
        {numero(valor, fracionario ? 6 : 2)}
      </span>
      {fracionario && (
        <span className="text-sm text-accent">{percentual(valor, 2)}</span>
      )}
    </span>
  );
}

export function EditorParametros({
  grupos,
  podeEditar,
  hoje,
}: {
  grupos: GrupoParametro[];
  podeEditar: boolean;
  hoje: string;
}) {
  const [reajustando, setReajustando] = useState<GrupoParametro | null>(null);
  const [criando, setCriando] = useState(false);
  const [expandido, setExpandido] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <Aviso tom="neutro">
        Estes são os números de política do sistema. Nenhum deles aparece no código:
        margem mínima, alçada, limite de faixa e probabilidade do funil são lidos daqui,
        pela vigência da data em questão.
      </Aviso>

      {podeEditar && (
        <div>
          <Button variant="acento" onClick={() => setCriando(true)}>
            <Plus className="size-4" />
            Novo parâmetro
          </Button>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {grupos.map((g) => (
          <Card key={g.chave}>
            <CardHeader>
              <CardTitle className="font-mono text-sm">{g.chave}</CardTitle>
              {g.descricao && <CardDescription>{g.descricao}</CardDescription>}
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {g.vigente ? (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <ValorLido valor={g.vigente.valor} />
                  <Badge tom="acento">
                    {vigencia(g.vigente.vigencia_inicio, g.vigente.vigencia_fim)}
                  </Badge>
                </div>
              ) : (
                <Aviso tom="alerta">
                  Sem valor vigente hoje. Qualquer cálculo que dependa desta chave vai
                  falhar.
                </Aviso>
              )}

              <div className="flex flex-wrap items-center gap-2">
                {podeEditar && (
                  <Button variant="outline" size="sm" onClick={() => setReajustando(g)}>
                    <TrendingUp className="size-3.5" />
                    Reajustar
                  </Button>
                )}
                {g.historico.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpandido(expandido === g.chave ? null : g.chave)}
                  >
                    <History className="size-3.5" />
                    {g.historico.length} vigência
                    {g.historico.length === 1 ? "" : "s"} anterior
                    {g.historico.length === 1 ? "" : "es"}
                  </Button>
                )}
              </div>

              {expandido === g.chave && (
                <ul className="flex flex-col gap-1.5 border-t border-border pt-3 text-sm">
                  {g.historico.map((h) => (
                    <li key={h.id} className="flex items-center justify-between gap-3">
                      <span className="tabular-nums text-muted-foreground">
                        {numero(h.valor, h.valor > 0 && h.valor < 1 ? 6 : 2)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {vigencia(h.vigencia_inicio, h.vigencia_fim)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Reajuste */}
      <Dialog.Root
        open={reajustando !== null}
        onOpenChange={(a) => !a && setReajustando(null)}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-marca-grafite/45" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-[var(--radius)] border border-border bg-card p-6 shadow-xl outline-none">
            <Dialog.Title className="font-titulo text-lg font-bold text-marca-azul">
              Reajustar {reajustando?.chave}
            </Dialog.Title>
            <Dialog.Description className="mt-1 text-sm text-muted-foreground">
              O valor atual não é sobrescrito. A vigência dele é fechada na véspera e uma
              linha nova começa na data informada — para que orçamento antigo continue
              conferindo.
            </Dialog.Description>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Fechar"
                className="absolute right-4 top-4 rounded p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="size-4" />
              </button>
            </Dialog.Close>

            {reajustando && (
              <FormReajuste
                key={reajustando.chave}
                grupo={reajustando}
                hoje={hoje}
                aoConcluir={() => setReajustando(null)}
              />
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Novo parâmetro */}
      <Dialog.Root open={criando} onOpenChange={setCriando}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-marca-grafite/45" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-[var(--radius)] border border-border bg-card p-6 shadow-xl outline-none">
            <Dialog.Title className="font-titulo text-lg font-bold text-marca-azul">
              Novo parâmetro
            </Dialog.Title>
            <Dialog.Description className="mt-1 text-sm text-muted-foreground">
              Percentual entra como fração: 15% é 0,15.
            </Dialog.Description>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Fechar"
                className="absolute right-4 top-4 rounded p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="size-4" />
              </button>
            </Dialog.Close>
            <FormNovo hoje={hoje} aoConcluir={() => setCriando(false)} />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

function FormReajuste({
  grupo,
  hoje,
  aoConcluir,
}: {
  grupo: GrupoParametro;
  hoje: string;
  aoConcluir: () => void;
}) {
  const [estado, enviar] = useActionState<EstadoForm, FormData>(reajustarParametro, {});
  useAviso(estado, aoConcluir);

  return (
    <form action={enviar} className="mt-5 flex flex-col gap-4">
      <input type="hidden" name="chave" value={grupo.chave} />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="valor-reajuste">Novo valor</Label>
        <Input
          id="valor-reajuste"
          name="valor"
          type="number"
          step="any"
          defaultValue={grupo.vigente?.valor}
          required
        />
        <p className="text-xs text-muted-foreground">
          Vigente hoje: {numero(grupo.vigente?.valor ?? 0, 6)}
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="inicio-reajuste">A partir de</Label>
        <Input
          id="inicio-reajuste"
          name="vigencia_inicio"
          type="date"
          defaultValue={hoje}
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="desc-reajuste">Observação (opcional)</Label>
        <Textarea
          id="desc-reajuste"
          name="descricao"
          defaultValue={grupo.descricao ?? ""}
          rows={2}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Dialog.Close asChild>
          <Button variant="outline" type="button">
            Cancelar
          </Button>
        </Dialog.Close>
        <BotaoSubmeter>Reajustar</BotaoSubmeter>
      </div>
    </form>
  );
}

function FormNovo({ hoje, aoConcluir }: { hoje: string; aoConcluir: () => void }) {
  const [estado, enviar] = useActionState<EstadoForm, FormData>(criarParametro, {});
  useAviso(estado, aoConcluir);

  return (
    <form action={enviar} className="mt-5 flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="chave-nova">Chave</Label>
        <Input
          id="chave-nova"
          name="chave"
          placeholder="margem_minima_grande"
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="valor-novo">Valor</Label>
        <Input id="valor-novo" name="valor" type="number" step="any" required />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="inicio-novo">Vigência a partir de</Label>
        <Input
          id="inicio-novo"
          name="vigencia_inicio"
          type="date"
          defaultValue={hoje}
          required
        />
        <p className="text-xs text-muted-foreground">
          A vigência fica aberta até {VIGENCIA_ABERTA.split("-").reverse().join("/")} —
          na prática, até o primeiro reajuste.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="desc-nova">Descrição</Label>
        <Textarea id="desc-nova" name="descricao" rows={2} />
      </div>

      <div className="flex justify-end gap-2">
        <Dialog.Close asChild>
          <Button variant="outline" type="button">
            Cancelar
          </Button>
        </Dialog.Close>
        <BotaoSubmeter variant="acento">Criar</BotaoSubmeter>
      </div>
    </form>
  );
}
