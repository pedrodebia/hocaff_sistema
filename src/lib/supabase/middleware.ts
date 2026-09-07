import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Rotas que existem sem sessão. */
const PUBLICAS = ["/entrar", "/auth"];

/**
 * Renova a sessão a cada navegação e barra quem não está logado.
 *
 * Isto é conveniência de navegação, não autorização: a garantia de acesso
 * a dado é sempre a RLS do Postgres. Um usuário que burlasse esta função
 * continuaria sem enxergar linha nenhuma que a policy não permitisse.
 */
export async function renovarSessao(request: NextRequest) {
  let resposta = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesParaGravar) {
          for (const { name, value } of cookiesParaGravar) {
            request.cookies.set(name, value);
          }
          resposta = NextResponse.next({ request });
          for (const { name, value, options } of cookiesParaGravar) {
            resposta.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const caminho = request.nextUrl.pathname;
  const ehPublica = PUBLICAS.some((p) => caminho.startsWith(p));

  if (!user && !ehPublica) {
    const destino = request.nextUrl.clone();
    destino.pathname = "/entrar";
    destino.searchParams.set("proxima", caminho);
    return NextResponse.redirect(destino);
  }

  if (user && caminho === "/entrar") {
    const destino = request.nextUrl.clone();
    destino.pathname = "/inicio";
    destino.search = "";
    return NextResponse.redirect(destino);
  }

  return resposta;
}
