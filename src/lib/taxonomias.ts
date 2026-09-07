/**
 * Tipos de taxonomia — o enum `taxonomia_tipo` do Postgres.
 *
 * Os ITENS de cada lista são dado, vivem em `taxonomia_item` e se editam
 * pela tela. Os TIPOS são estrutura: acrescentar um tipo novo é migração.
 * Nenhuma outra lista de negócio pode aparecer em código.
 */
export const TIPOS_TAXONOMIA = [
  "grupo",
  "funcao",
  "cargo",
  "segmento",
  "especialidade",
  "natureza_cliente",
  "papel_hocaff",
  "origem_captacao",
  "tipo_solicitacao",
  "regime_preco",
  "criterio_medicao",
  "base_pagamento",
  "motivo_perda",
  "motivo_revisao",
  "macrorregiao",
  "modalidade_execucao",
  "status_projeto",
  "papel_equipe",
  "escala",
  "status_medicao",
  "status_marco",
  "periodicidade",
  "unidade",
  "tipo_despesa",
  "atividade_nao_projeto",
  "rubrica_receita",
  "rubrica_despesa",
] as const;

export type TipoTaxonomia = (typeof TIPOS_TAXONOMIA)[number];

export const ROTULO_TIPO: Record<TipoTaxonomia, string> = {
  grupo: "Grupo",
  funcao: "Função (grupo de custo)",
  cargo: "Cargo",
  segmento: "Segmento",
  especialidade: "Especialidade",
  natureza_cliente: "Natureza do cliente",
  papel_hocaff: "Papel da Hocaff no contrato",
  origem_captacao: "Origem da captação",
  tipo_solicitacao: "Tipo de solicitação",
  regime_preco: "Regime de preço",
  criterio_medicao: "Critério de medição",
  base_pagamento: "Base de pagamento",
  motivo_perda: "Motivo de perda",
  motivo_revisao: "Motivo de revisão",
  macrorregiao: "Macrorregião",
  modalidade_execucao: "Modalidade de execução",
  status_projeto: "Status do projeto",
  papel_equipe: "Papel na equipe",
  escala: "Escala (probabilidade e impacto)",
  status_medicao: "Status da medição",
  status_marco: "Status do marco",
  periodicidade: "Periodicidade de reunião",
  unidade: "Unidade",
  tipo_despesa: "Tipo de despesa",
  atividade_nao_projeto: "Atividade fora de projeto",
  rubrica_receita: "Rubrica de receita",
  rubrica_despesa: "Rubrica de despesa",
};

/** Agrupamento só para organizar a tela. Não tem efeito no banco. */
export const GRUPOS_TAXONOMIA: { titulo: string; tipos: TipoTaxonomia[] }[] = [
  {
    titulo: "Pessoas e capacidade",
    tipos: ["funcao", "cargo", "especialidade", "papel_equipe", "atividade_nao_projeto"],
  },
  {
    titulo: "Clientes e mercado",
    tipos: ["grupo", "segmento", "natureza_cliente", "macrorregiao", "papel_hocaff"],
  },
  {
    titulo: "Funil e proposta",
    tipos: [
      "origem_captacao",
      "tipo_solicitacao",
      "regime_preco",
      "criterio_medicao",
      "base_pagamento",
      "motivo_perda",
      "motivo_revisao",
      "modalidade_execucao",
    ],
  },
  {
    titulo: "Execução",
    tipos: ["status_projeto", "status_marco", "status_medicao", "periodicidade", "escala", "unidade"],
  },
  {
    titulo: "Custos e financeiro",
    tipos: ["tipo_despesa", "rubrica_receita", "rubrica_despesa"],
  },
];

export function ehTipoTaxonomia(v: string): v is TipoTaxonomia {
  return (TIPOS_TAXONOMIA as readonly string[]).includes(v);
}
