import type { Metadata, Viewport } from "next";
import { Montserrat, Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

/**
 * A marca especifica Gotham. Não há licença web dela aqui, e Montserrat é
 * a geométrica aberta mais próxima — mesmo esqueleto, mesma leitura em
 * caixa alta. Se a Hocaff licenciar Gotham, troca-se só este bloco.
 */
const titulo = Montserrat({
  variable: "--fonte-titulo",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  display: "swap",
});

const texto = Inter({
  variable: "--fonte-texto",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Hocaff · Gestão de Novos Negócios e Projetos",
    template: "%s · Hocaff",
  },
  description:
    "Sistema interno da Hocaff Engenharia: funil, propostas, portfólio, timesheet, medição e resultado.",
};

export const viewport: Viewport = {
  themeColor: "#0A3050",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${titulo.variable} ${texto.variable} h-full`}
    >
      <body className="min-h-full">
        {children}
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
