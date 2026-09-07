import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Cliente Supabase do servidor, com a sessão vinda do cookie.
 *
 * Continua sendo a chave anon: componentes de servidor e Server Actions
 * enxergam exatamente o que a RLS permite para o usuário logado. Nenhuma
 * tela do sistema usa a chave de serviço.
 */
export async function clienteServidor() {
  const armazem = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return armazem.getAll();
        },
        setAll(cookiesParaGravar) {
          try {
            for (const { name, value, options } of cookiesParaGravar) {
              armazem.set(name, value, options);
            }
          } catch {
            // Componente de servidor não grava cookie. O middleware já
            // renovou a sessão antes de chegar aqui, então ignorar é seguro.
          }
        },
      },
    },
  );
}
