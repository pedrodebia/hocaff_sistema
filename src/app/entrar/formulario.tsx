"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { entrarComSenha, enviarLink, type EstadoEntrada } from "./acoes";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Label, Aviso } from "@/componentes/ui/primitivos";

function BotaoEnviar({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Um instante…" : children}
    </Button>
  );
}

export function FormularioEntrada({ proxima }: { proxima: string }) {
  const [modo, setModo] = useState<"senha" | "link">("senha");
  const acao = modo === "senha" ? entrarComSenha : enviarLink;
  const [estado, executar] = useActionState<EstadoEntrada, FormData>(acao, {});

  return (
    <div className="flex flex-col gap-5">
      <form action={executar} className="flex flex-col gap-4">
        <input type="hidden" name="proxima" value={proxima} />

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">E-mail corporativo</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            placeholder="nome@hocaff.com.br"
            required
          />
        </div>

        {modo === "senha" && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="senha">Senha</Label>
            <Input
              id="senha"
              name="senha"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>
        )}

        {estado.erro && <Aviso tom="perigo">{estado.erro}</Aviso>}
        {estado.aviso && <Aviso tom="acento">{estado.aviso}</Aviso>}

        <BotaoEnviar>
          {modo === "senha" ? "Entrar" : "Receber link por e-mail"}
        </BotaoEnviar>
      </form>

      <button
        type="button"
        onClick={() => setModo(modo === "senha" ? "link" : "senha")}
        className="text-sm text-muted-foreground underline-offset-4 hover:text-accent hover:underline"
      >
        {modo === "senha"
          ? "Prefiro receber um link por e-mail"
          : "Prefiro entrar com senha"}
      </button>
    </div>
  );
}
