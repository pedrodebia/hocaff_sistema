const LOCALE = "pt-BR";

export function reais(v: number | null | undefined) {
  if (v === null || v === undefined) return "—";
  return new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency: "BRL",
  }).format(v);
}

/** Recebe fração (0.15) e devolve percentual (15,0%), como o banco guarda. */
export function percentual(v: number | null | undefined, casas = 1) {
  if (v === null || v === undefined) return "—";
  return new Intl.NumberFormat(LOCALE, {
    style: "percent",
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  }).format(v);
}

export function numero(v: number | null | undefined, casas = 0) {
  if (v === null || v === undefined) return "—";
  return new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  }).format(v);
}

/** Data ISO (`2026-04-13`) para `13/04/2026`, sem passar por fuso. */
export function data(v: string | null | undefined) {
  if (!v) return "—";
  const [ano, mes, dia] = v.slice(0, 10).split("-");
  if (!ano || !mes || !dia) return v;
  return `${dia}/${mes}/${ano}`;
}

/** Vigência aberta é gravada como 2099-12-31; na tela isso é ruído. */
export const VIGENCIA_ABERTA = "2099-12-31";

export function vigencia(inicio: string, fim: string) {
  const de = data(inicio);
  return fim.slice(0, 10) === VIGENCIA_ABERTA ? `desde ${de}` : `${de} a ${data(fim)}`;
}
