import type { Papel } from "@/lib/papeis";

export type ItemNav = {
  titulo: string;
  href: string;
  /** Ícone do lucide-react, resolvido na barra lateral. */
  icone: string;
  /** Sem `papeis`, o item aparece para qualquer pessoa autenticada. */
  papeis?: Papel[];
  descricao?: string;
};

export type SecaoNav = {
  titulo?: string;
  itens: ItemNav[];
};

/**
 * Mapa da navegação. Cada fase do PLANO.md acrescenta itens aqui.
 *
 * O filtro por papel some com o item do menu — é conveniência, não
 * segurança. Quem digitar a URL na mão continua barrado pela RLS, que é
 * onde a garantia mora.
 */
const MAPA: SecaoNav[] = [
  {
    itens: [
      { titulo: "Início", href: "/inicio", icone: "LayoutDashboard" },
      {
        titulo: "Diagnóstico de acesso",
        href: "/diagnostico",
        icone: "ShieldCheck",
        descricao: "O que a sua sessão lê e o que ela não lê",
      },
    ],
  },
  {
    titulo: "Administração",
    itens: [
      {
        titulo: "Taxonomias",
        href: "/admin/taxonomias",
        icone: "ListTree",
        papeis: ["DE", "DT"],
        descricao: "As listas de todo o sistema",
      },
      {
        titulo: "Parâmetros",
        href: "/admin/parametros",
        icone: "SlidersHorizontal",
        papeis: ["DE", "DT"],
        descricao: "Margens, alçadas e limites, com vigência",
      },
    ],
  },
];

export function navegacaoPara(papeis: readonly Papel[]): SecaoNav[] {
  return MAPA.map((secao) => ({
    ...secao,
    itens: secao.itens.filter(
      (item) => !item.papeis || item.papeis.some((p) => papeis.includes(p)),
    ),
  })).filter((secao) => secao.itens.length > 0);
}
