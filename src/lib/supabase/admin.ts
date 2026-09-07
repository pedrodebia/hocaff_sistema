import { createClient } from "@supabase/supabase-js";

/**
 * Cliente com a chave de serviço. Ele IGNORA a RLS.
 *
 * Só existe para dois usos fora da aplicação: o seed de desenvolvimento e
 * os testes de RLS, que precisam montar o cenário antes de logar como cada
 * papel. Nenhuma rota, página ou Server Action pode importar este arquivo —
 * se importar, o modelo de confidencialidade deixou de existir.
 */
export function clienteAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !chave) {
    throw new Error(
      "Faltam NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente.",
    );
  }

  return createClient(url, chave, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
