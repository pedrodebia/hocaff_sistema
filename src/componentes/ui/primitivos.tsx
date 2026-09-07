import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cn } from "@/lib/utils";

/* ------------------------------- Label ------------------------------- */

export function Label({
  className,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      className={cn(
        "text-sm font-medium leading-none peer-disabled:opacity-70",
        className,
      )}
      {...props}
    />
  );
}

/* -------------------------------- Card -------------------------------- */

export function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius)] border border-border bg-card shadow-[0_1px_2px_rgba(10,48,80,0.05)]",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-1 p-5", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return (
    <h3 className={cn("text-base font-semibold text-primary", className)} {...props} />
  );
}

export function CardDescription({ className, ...props }: React.ComponentProps<"p">) {
  return <p className={cn("text-sm text-muted-foreground", className)} {...props} />;
}

export function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("p-5 pt-0", className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex items-center gap-2 border-t border-border p-5", className)}
      {...props}
    />
  );
}

/* ------------------------------- Badge -------------------------------- */

const TOM = {
  neutro: "bg-muted text-muted-foreground",
  marca: "bg-primary/10 text-primary",
  acento: "bg-accent/12 text-accent",
  alerta: "bg-marca-amarelo/20 text-[#7a5b00]",
  perigo: "bg-destructive/10 text-destructive",
} as const;

export function Badge({
  className,
  tom = "neutro",
  ...props
}: React.ComponentProps<"span"> & { tom?: keyof typeof TOM }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        TOM[tom],
        className,
      )}
      {...props}
    />
  );
}

/* ------------------------------- Tabela ------------------------------- */

export function Tabela({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div className="rolagem-x rounded-[var(--radius)] border border-border bg-card">
      <table className={cn("w-full caption-bottom text-sm", className)} {...props} />
    </div>
  );
}

export function TCabecalho({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      className={cn("border-b border-border bg-muted/60 text-left", className)}
      {...props}
    />
  );
}

export function TCorpo({ className, ...props }: React.ComponentProps<"tbody">) {
  return <tbody className={cn("[&_tr:last-child]:border-0", className)} {...props} />;
}

export function TLinha({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      className={cn("border-b border-border transition-colors hover:bg-muted/40", className)}
      {...props}
    />
  );
}

export function TCabecaCelula({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      className={cn(
        "h-10 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

export function TCelula({ className, ...props }: React.ComponentProps<"td">) {
  return <td className={cn("px-3 py-2.5 align-middle", className)} {...props} />;
}

/* ------------------------------- Aviso -------------------------------- */

export function Aviso({
  tom = "neutro",
  titulo,
  children,
  className,
}: {
  tom?: "neutro" | "acento" | "alerta" | "perigo";
  titulo?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const cores = {
    neutro: "border-border bg-muted/50 text-foreground",
    acento: "border-accent/30 bg-accent/8 text-foreground",
    alerta: "border-marca-amarelo/50 bg-marca-amarelo/10 text-foreground",
    perigo: "border-destructive/30 bg-destructive/8 text-foreground",
  } as const;

  return (
    <div className={cn("rounded-[var(--radius)] border p-4 text-sm", cores[tom], className)}>
      {titulo ? <p className="mb-1 font-semibold">{titulo}</p> : null}
      {children}
    </div>
  );
}
