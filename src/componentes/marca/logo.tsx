import { cn } from "@/lib/utils";

/**
 * Marca Hocaff.
 *
 * O símbolo é desenhado em SVG com as cores do kit para não depender de
 * arquivo binário e ficar nítido em qualquer densidade de tela. Quando o
 * arquivo oficial estiver disponível, troque `Simbolo` por um <img> ou
 * <svg> importado — ver docs/MARCA.md.
 */

export function Simbolo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      role="img"
      aria-label="Símbolo da Hocaff Engenharia"
      className={cn("shrink-0", className)}
    >
      <defs>
        <linearGradient id="hc-tile" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#4ED4C1" />
          <stop offset="45%" stopColor="#00A789" />
          <stop offset="100%" stopColor="#0A3050" />
        </linearGradient>
        <linearGradient id="hc-esfera" x1="0.15" y1="0" x2="0.9" y2="1">
          <stop offset="0%" stopColor="#7FE6D8" />
          <stop offset="55%" stopColor="#00A789" />
          <stop offset="100%" stopColor="#072A3E" />
        </linearGradient>
      </defs>

      <rect width="64" height="64" rx="10" fill="url(#hc-tile)" />
      {/* Vinco diagonal — a "dobra" do plano */}
      <path d="M0 64 L64 0 L64 12 L12 64 Z" fill="#FFFFFF" opacity="0.16" />
      {/* Bloco de profundidade */}
      <path d="M22 64 L64 22 L64 64 Z" fill="#072A3E" opacity="0.45" />
      {/* Esfera */}
      <circle cx="43" cy="21" r="13" fill="url(#hc-esfera)" />
      <ellipse
        cx="39"
        cy="17"
        rx="10"
        ry="5"
        transform="rotate(-38 39 17)"
        fill="#FFFFFF"
        opacity="0.5"
      />
    </svg>
  );
}

export function Logo({
  className,
  invertido = false,
  compacto = false,
}: {
  className?: string;
  /** Sobre fundo escuro (barra lateral). */
  invertido?: boolean;
  /** Só o símbolo. */
  compacto?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <Simbolo className="h-8 w-8" />
      {!compacto && (
        <span className="flex flex-col leading-none">
          <span
            className={cn(
              "font-titulo text-[1.35rem] font-extrabold tracking-[-0.03em]",
              invertido ? "text-white" : "text-marca-azul",
            )}
          >
            HOCAFF
          </span>
          <span
            className={cn(
              "font-titulo text-[0.6rem] font-bold tracking-[0.34em]",
              invertido ? "text-marca-verde-claro" : "text-marca-verde",
            )}
          >
            ENGENHARIA
          </span>
        </span>
      )}
    </span>
  );
}
