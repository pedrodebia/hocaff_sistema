/**
 * Papéis do sistema.
 *
 * Isto NÃO é uma taxonomia de negócio — é o enum `papel` do Postgres, que
 * as policies de RLS usam por nome. Ele é estrutura, não lista editável:
 * criar um papel novo é migração, não edição de registro.
 */
export const PAPEIS = [
  "CNN",
  "DT",
  "DE",
  "GPR",
  "CPR",
  "LT",
  "GCM",
  "ADM",
] as const;

export type Papel = (typeof PAPEIS)[number];

export const ROTULO_PAPEL: Record<Papel, string> = {
  CNN: "Coordenação de Novos Negócios",
  DT: "Diretoria Técnica",
  DE: "Diretoria de Engenharia",
  GPR: "Gerência de Projetos",
  CPR: "Coordenação de Projetos",
  LT: "Líder Técnico",
  GCM: "Gestão de Custos e Medições",
  ADM: "Administrativo / Financeiro",
};

/**
 * Espelho de `pode_ver_restrito()` no banco. Serve para a interface decidir
 * o que desenhar — nunca para decidir o que devolver. Quem garante o sigilo
 * de custo e margem é a policy, não esta constante.
 */
export const PAPEIS_RESTRITO: readonly Papel[] = ["GCM", "DE", "DT"];

export function podeVerRestrito(papeis: readonly Papel[]) {
  return papeis.some((p) => PAPEIS_RESTRITO.includes(p));
}

export function temPapel(papeis: readonly Papel[], ...quais: Papel[]) {
  return papeis.some((p) => quais.includes(p));
}
