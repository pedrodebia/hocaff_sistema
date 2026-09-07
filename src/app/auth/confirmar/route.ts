import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { clienteServidor } from "@/lib/supabase/servidor";

/**
 * Destino do link enviado por e-mail. Troca o token pela sessão em cookie e
 * segue para a página pedida.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const bruto = searchParams.get("proxima") ?? "/inicio";
  const proxima = bruto.startsWith("/") && !bruto.startsWith("//") ? bruto : "/inicio";

  if (!token_hash || !type) {
    return NextResponse.redirect(`${origin}/entrar?erro=link_invalido`);
  }

  const supabase = await clienteServidor();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash });

  if (error) {
    return NextResponse.redirect(`${origin}/entrar?erro=link_expirado`);
  }

  return NextResponse.redirect(`${origin}${proxima}`);
}
