import type { NextRequest } from "next/server";
import { renovarSessao } from "@/lib/supabase/middleware";

/**
 * Convenção `proxy` do Next 16 — antigo `middleware`. Roda antes de cada
 * navegação para renovar a sessão do Supabase e mandar quem não está logado
 * para a tela de entrada.
 */
export default async function proxy(request: NextRequest) {
  return renovarSessao(request);
}

export const config = {
  matcher: [
    /*
     * Tudo, menos arquivo estático e imagem. O `_next` e os assets não
     * precisam de sessão e pagariam o custo de uma chamada de auth.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
