"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import * as Dialog from "@radix-ui/react-dialog";
import { toast } from "sonner";
import { Pencil, Plus, X } from "lucide-react";
import { criarItem, atualizarItem, alternarAtivo, type EstadoForm } from "../acoes";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Label,
  Badge,
  Tabela,
  TCabecalho,
  TCabecaCelula,
  TCorpo,
  TLinha,
  TCelula,
} from "@/componentes/ui/primitivos";
import type { TipoTaxonomia } from "@/lib/taxonomias";

export type ItemTaxonomia = {
  id: string;
  codigo: string;
  rotulo: string;
  ordem: number;
  ativo: boolean;
  extra: Record<string, unknown>;
};

export type OpcaoFuncao = { id: string; rotulo: string };

/** Avisa por toast e devolve o estado, para não repetir isto em cada form. */
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
  size,
}: {
  children: React.ReactNode;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} size={size} disabled={pending}>
      {pending ? "…" : children}
    </Button>
  );
}

/* --------------------------- Campos comuns --------------------------- */

function Campos({
  tipo,
  funcoes,
  item,
  proximaOrdem,
}: {
  tipo: TipoTaxonomia;
  funcoes: OpcaoFuncao[];
  item?: ItemTaxonomia;
  proximaOrdem: number;
}) {
  const funcaoAtual = (item?.extra?.funcao_id as string | undefined) ?? "";

  return (
    <>
      <input type="hidden" name="tipo" value={tipo} />
      {item && <input type="hidden" name="id" value={item.id} />}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`codigo-${item?.id ?? "novo"}`}>Código</Label>
        <Input
          id={`codigo-${item?.id ?? "novo"}`}
          name="codigo"
          defaultValue={item?.codigo}
          placeholder="SEG-10"
          required
        />
      </div>

      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <Label htmlFor={`rotulo-${item?.id ?? "novo"}`}>Rótulo</Label>
        <Input
          id={`rotulo-${item?.id ?? "novo"}`}
          name="rotulo"
          defaultValue={item?.rotulo}
          placeholder="Como aparece nos seletores"
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`ordem-${item?.id ?? "novo"}`}>Ordem</Label>
        <Input
          id={`ordem-${item?.id ?? "novo"}`}
          name="ordem"
          type="number"
          min={0}
          defaultValue={item?.ordem ?? proximaOrdem}
        />
      </div>

      {tipo === "cargo" && (
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor={`funcao-${item?.id ?? "novo"}`}>Função (grupo de custo)</Label>
          <select
            id={`funcao-${item?.id ?? "novo"}`}
            name="funcao_id"
            defaultValue={funcaoAtual}
            className="h-10 rounded-[var(--radius)] border border-input bg-card px-3 text-sm"
          >
            <option value="">— sem função —</option>
            {funcoes.map((f) => (
              <option key={f.id} value={f.id}>
                {f.rotulo}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            É por aqui que a hora apontada vira custo. Cargo sem função não entra na
            valoração.
          </p>
        </div>
      )}
    </>
  );
}

/* ------------------------------ Editor ------------------------------- */

export function EditorTaxonomia({
  tipo,
  rotuloTipo,
  itens,
  funcoes,
  podeEditar,
}: {
  tipo: TipoTaxonomia;
  rotuloTipo: string;
  itens: ItemTaxonomia[];
  funcoes: OpcaoFuncao[];
  podeEditar: boolean;
}) {
  const proximaOrdem = itens.reduce((m, i) => Math.max(m, i.ordem), 0) + 1;
  const [estadoNovo, criar] = useActionState<EstadoForm, FormData>(criarItem, {});
  const [emEdicao, setEmEdicao] = useState<ItemTaxonomia | null>(null);

  useAviso(estadoNovo);

  return (
    <div className="flex flex-col gap-6">
      {podeEditar && (
        <Card>
          <CardHeader>
            <CardTitle>Novo item</CardTitle>
            <CardDescription>
              Aparece imediatamente em todos os seletores que usam {rotuloTipo.toLowerCase()}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              action={criar}
              key={estadoNovo.ok ?? "form"}
              className="grid gap-4 sm:grid-cols-4"
            >
              <Campos tipo={tipo} funcoes={funcoes} proximaOrdem={proximaOrdem} />
              <div className="flex items-end sm:col-span-4">
                <BotaoSubmeter variant="acento">
                  <Plus className="size-4" />
                  Incluir
                </BotaoSubmeter>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Tabela>
        <TCabecalho>
          <tr>
            <TCabecaCelula className="w-24">Código</TCabecaCelula>
            <TCabecaCelula>Rótulo</TCabecaCelula>
            <TCabecaCelula className="w-20 text-right">Ordem</TCabecaCelula>
            <TCabecaCelula className="w-28">Situação</TCabecaCelula>
            {podeEditar && <TCabecaCelula className="w-44 text-right">Ações</TCabecaCelula>}
          </tr>
        </TCabecalho>
        <TCorpo>
          {itens.length === 0 && (
            <TLinha>
              <TCelula colSpan={podeEditar ? 5 : 4} className="py-8 text-center text-muted-foreground">
                Nenhum item cadastrado neste tipo.
              </TCelula>
            </TLinha>
          )}

          {itens.map((item) => (
            <TLinha key={item.id} className={item.ativo ? undefined : "opacity-55"}>
              <TCelula className="font-mono text-xs">{item.codigo}</TCelula>
              <TCelula className="font-medium">{item.rotulo}</TCelula>
              <TCelula className="text-right tabular-nums">{item.ordem}</TCelula>
              <TCelula>
                <Badge tom={item.ativo ? "acento" : "neutro"}>
                  {item.ativo ? "Ativo" : "Inativo"}
                </Badge>
              </TCelula>
              {podeEditar && (
                <TCelula>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEmEdicao(item)}
                      type="button"
                    >
                      <Pencil className="size-3.5" />
                      Editar
                    </Button>
                    <FormAtivo item={item} tipo={tipo} />
                  </div>
                </TCelula>
              )}
            </TLinha>
          ))}
        </TCorpo>
      </Tabela>

      <Dialog.Root
        open={emEdicao !== null}
        onOpenChange={(aberto) => !aberto && setEmEdicao(null)}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-marca-grafite/45" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-[var(--radius)] border border-border bg-card p-6 shadow-xl outline-none">
            <Dialog.Title className="font-titulo text-lg font-bold text-marca-azul">
              Editar item
            </Dialog.Title>
            <Dialog.Description className="mt-1 text-sm text-muted-foreground">
              Renomear o rótulo muda o texto em toda a interface. O código de item já em
              uso não deveria mudar.
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

            {emEdicao && (
              <FormEdicao
                key={emEdicao.id}
                item={emEdicao}
                tipo={tipo}
                funcoes={funcoes}
                proximaOrdem={proximaOrdem}
                aoConcluir={() => setEmEdicao(null)}
              />
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

function FormEdicao({
  item,
  tipo,
  funcoes,
  proximaOrdem,
  aoConcluir,
}: {
  item: ItemTaxonomia;
  tipo: TipoTaxonomia;
  funcoes: OpcaoFuncao[];
  proximaOrdem: number;
  aoConcluir: () => void;
}) {
  const [estado, salvar] = useActionState<EstadoForm, FormData>(atualizarItem, {});
  useAviso(estado, aoConcluir);

  return (
    <form action={salvar} className="mt-5 grid gap-4 sm:grid-cols-4">
      <Campos tipo={tipo} funcoes={funcoes} item={item} proximaOrdem={proximaOrdem} />
      <div className="flex justify-end gap-2 sm:col-span-4">
        <Dialog.Close asChild>
          <Button variant="outline" type="button">
            Cancelar
          </Button>
        </Dialog.Close>
        <BotaoSubmeter>Salvar</BotaoSubmeter>
      </div>
    </form>
  );
}

function FormAtivo({ item, tipo }: { item: ItemTaxonomia; tipo: TipoTaxonomia }) {
  const [estado, alternar] = useActionState<EstadoForm, FormData>(alternarAtivo, {});
  useAviso(estado);

  return (
    <form action={alternar}>
      <input type="hidden" name="id" value={item.id} />
      <input type="hidden" name="tipo" value={tipo} />
      <input type="hidden" name="ativo" value={String(item.ativo)} />
      <BotaoSubmeter variant="ghost" size="sm">
        {item.ativo ? "Desativar" : "Reativar"}
      </BotaoSubmeter>
    </form>
  );
}
