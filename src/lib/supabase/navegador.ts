import { createBrowserClient } from "@supabase/ssr";

/**
 * Cliente Supabase do navegador. Usa a chave publicável (anon): tudo o que
 * ele consegue ler é o que a RLS permitir para a sessão. Não existe atalho.
 */
export function clienteNavegador() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
