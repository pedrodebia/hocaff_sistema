/**
 * Dados de desenvolvimento, transcritos das planilhas de origem.
 *
 *   CAD_PESSOAS.xlsx          → PESSOAS
 *   BASE_PORTFOLIO.xlsx       → CLIENTES, OPORTUNIDADES, PROJETOS, BASELINE,
 *                               EQUIPE, MARCOS, RISCOS, MEDIÇÃO FÍSICA, HH
 *   BASE_CUSTOS_MEDICOES.xlsx → CUSTO_RECURSO, ECONÔMICO, MEDIÇÃO FINANCEIRA,
 *                               FATURAMENTO  (tudo restrito)
 *
 * As datas estão no serial do Excel, como saíram do arquivo. `deSerial()`
 * converte. Manter o número cru evita erro de transcrição.
 *
 * DIVERGÊNCIA CONHECIDA, a resolver na migração dos dados reais: na aba
 * HH_REALIZADO, Marina Alkimin e Letício di Giorgio aparecem com cargo
 * "Engenheiro", enquanto no CAD_PESSOAS o cargo de ambos é "Coordenador de
 * Projetos". O cadastro é a fonte de verdade do sistema, então é ele que vale
 * aqui — e é por isso que o custo realizado deste seed não vai bater com o da
 * planilha até a divergência ser decidida. Ver fase F7 do PLANO.md.
 */

/** Serial do Excel (epoch 1899-12-30) para data ISO. */
export function deSerial(serial: number): string {
  const ms = Date.UTC(1899, 11, 30) + serial * 86_400_000;
  return new Date(ms).toISOString().slice(0, 10);
}

export type PapelSistema =
  | "CNN" | "DT" | "DE" | "GPR" | "CPR" | "LT" | "GCM" | "ADM";

export const SENHA_DEV = "Hocaff@2026";

export const PESSOAS = [
  { matricula: "HOC-001", nome: "Caio Condi", email: "caio.condi@hocaff.com.br",
    cargo: "CAR-11", nivel: 3, vinculo: "Própria", especialidade: "ESP-08",
    admissao: 43467, jornada: 176, aproveitamento: 0.35, papeis: ["DE"] },
  { matricula: "HOC-002", nome: "Ana Flávia Pontes", email: "ana.pontes@hocaff.com.br",
    cargo: "CAR-11", nivel: 3, vinculo: "Própria", especialidade: "ESP-03",
    admissao: 43467, jornada: 176, aproveitamento: 0.45, papeis: ["DT"] },
  { matricula: "HOC-003", nome: "Giovanna Arroyo", email: "giovanna.arroyo@hocaff.com.br",
    cargo: "CAR-10", nivel: 2, vinculo: "Própria", especialidade: "ESP-08",
    admissao: 44634, jornada: 176, aproveitamento: 0.6, papeis: ["GPR"] },
  { matricula: "HOC-004", nome: "Guilherme Koike", email: "guilherme.koike@hocaff.com.br",
    cargo: "CAR-09", nivel: 2, vinculo: "Própria", especialidade: "ESP-08",
    admissao: 44410, jornada: 176, aproveitamento: 0.3, papeis: ["CNN"] },
  { matricula: "HOC-005", nome: "Hugo Schneider", email: "hugo.schneider@hocaff.com.br",
    cargo: "CAR-08", nivel: 2, vinculo: "Própria", especialidade: "ESP-01",
    admissao: 44242, jornada: 176, aproveitamento: 0.75, papeis: ["CPR"] },
  { matricula: "HOC-006", nome: "Rômulo Marinho", email: "romulo.marinho@hocaff.com.br",
    cargo: "CAR-08", nivel: 3, vinculo: "Própria", especialidade: "ESP-01",
    admissao: 43983, jornada: 176, aproveitamento: 0.75, papeis: ["CPR"] },
  { matricula: "HOC-007", nome: "Marina Alkimin", email: "marina.alkimin@hocaff.com.br",
    cargo: "CAR-08", nivel: 2, vinculo: "Própria", especialidade: "ESP-02",
    admissao: 44571, jornada: 176, aproveitamento: 0.75, papeis: ["CPR"] },
  { matricula: "HOC-008", nome: "Letício di Giorgio", email: "leticio.digiorgio@hocaff.com.br",
    cargo: "CAR-08", nivel: 3, vinculo: "Própria", especialidade: "ESP-04",
    admissao: 44095, jornada: 176, aproveitamento: 0.75, papeis: ["CPR"] },
  { matricula: "HOC-009", nome: "George Diban", email: "george.diban@hocaff.com.br",
    cargo: "CAR-08", nivel: 1, vinculo: "Própria", especialidade: "ESP-03",
    admissao: 45019, jornada: 176, aproveitamento: 0.75, papeis: ["CPR"] },
  { matricula: "HOC-010", nome: "Bruno Borges", email: "bruno.borges@hocaff.com.br",
    cargo: "CAR-08", nivel: 2, vinculo: "Própria", especialidade: "ESP-01",
    admissao: 44760, jornada: 176, aproveitamento: 0.75, papeis: ["CPR"] },
  { matricula: "HOC-011", nome: "Angélica Pontes", email: "angelica.pontes@hocaff.com.br",
    cargo: "CAR-07", nivel: 2, vinculo: "Própria", especialidade: "ESP-08",
    admissao: 44320, jornada: 176, aproveitamento: 0.2, papeis: ["ADM"] },
  // Posição a preencher (CLAUDE.md §3). Existe no seed para que dê para
  // navegar pelo lado restrito em desenvolvimento.
  { matricula: "HOC-012", nome: "Gestão de Custos e Medições (a definir)",
    email: "gcm@hocaff.com.br",
    cargo: "CAR-07", nivel: 3, vinculo: "Própria", especialidade: "ESP-08",
    admissao: 46023, jornada: 176, aproveitamento: 0.6, papeis: ["GCM"] },
] satisfies ReadonlyArray<{
  matricula: string; nome: string; email: string; cargo: string; nivel: number;
  vinculo: "Própria" | "Terceirizada"; especialidade: string; admissao: number;
  jornada: number; aproveitamento: number; papeis: PapelSistema[];
}>;

export const CLIENTES = [
  { codigo: "CLI-0001", nome: "Prefeitura Municipal de Agudos",
    natureza: "NAT-01", segmento: "SEG-08" },
  { codigo: "CLI-0002", nome: "Mosaico Engenharia Ltda.",
    natureza: "NAT-02", segmento: "SEG-07" },
];

const OBJETO_0245 =
  "Projeto executivo de drenagem e pavimentação do Distrito Industrial II";
const OBJETO_0246 =
  "Terraplenagem e drenagem do loteamento Residencial NEWE ATMA";

export const OPORTUNIDADES = [
  {
    codigo: "OP-I-0308", grupo: "I", cliente: "CLI-0001",
    registrado_por: "HOC-004", captado_por: "HOC-004",
    origem: "ORI-04", tipo_solicitacao: "TIP-01", papel_hocaff: "PAP-01",
    especialidade: "ESP-01", objeto: OBJETO_0245,
    municipio: "Agudos", uf: "SP", macrorregiao: "MAC-01",
    data_entrada: 46042, prazo_proposta: 46081, prazo_execucao_meses: 8,
    data_qualificacao: 46049, decisao: "Go" as const,
    qualificado_por_1: "HOC-004", qualificado_por_2: "HOC-001",
    criterios: { fit: "Sim", capacidade: "Sim", habilitacao: "Sim",
                 prazo: "Sim", risco: "Sim", estrategico: "Sim" },
    estagio: 5, data_estagio: 46110, data_desfecho: 46110,
    valor_estimado_inicial: 250000,
    contato_cliente: "Eng. Marcos Vinícius — Secretaria de Obras",
  },
  {
    codigo: "OP-I-0309", grupo: "I", cliente: "CLI-0002",
    registrado_por: "HOC-004", captado_por: "HOC-003",
    origem: "ORI-02", tipo_solicitacao: "TIP-02", papel_hocaff: "PAP-02",
    especialidade: "ESP-01", objeto: OBJETO_0246,
    municipio: "São José do Rio Preto", uf: "SP", macrorregiao: "MAC-02",
    data_entrada: 46049, prazo_proposta: 46077, prazo_execucao_meses: 10,
    data_qualificacao: 46053, decisao: "Go" as const,
    qualificado_por_1: "HOC-004", qualificado_por_2: "HOC-002",
    criterios: { fit: "Sim", capacidade: "Sim", habilitacao: "NA",
                 prazo: "Sim", risco: "Sim", estrategico: "Sim" },
    estagio: 5, data_estagio: 46108, data_desfecho: 46108,
    valor_estimado_inicial: 600000,
    contato_cliente: "Eng. Patrícia Duarte — Engenharia",
  },
];

export const REVISOES = [
  {
    oportunidade: "OP-I-0308", numero: 0, data_emissao: 46074,
    motivo: "REV-00", o_que_mudou: "Proposta original.",
    regime_preco: "REG-02", criterio_medicao: "MED-03", modalidade: "MOD-02",
    base_pagamento: "PAG-01", prazo_pagamento_dias: 30,
    prazo_execucao_meses: 8, validade: 46134,
    custo_terceiros: 42000, despesas_diretas: 9800,
    ha_faturamento_direto: true, valor_faturamento_direto: 53760,
    valor_proposto: 268000, status: "substituida" as const,
    economico: {
      custo_hh_proprio: 132260, custo_total: 142060,
      custo_faturamento_direto: 42000,
      bdi_cheio: 0.4, bdi_reduzido: 0.28,
      margem_valor: 33096.8, margem_pct: 0.15466,
      alcada: "DT",
    },
  },
  {
    oportunidade: "OP-I-0308", numero: 1, data_emissao: 46101,
    motivo: "REV-02",
    o_que_mudou:
      "Ajuste comercial na negociação: desconto de 4% sobre a proposta original, " +
      "sem alteração de escopo nem de prazo.",
    regime_preco: "REG-02", criterio_medicao: "MED-03", modalidade: "MOD-02",
    base_pagamento: "PAG-01", prazo_pagamento_dias: 30,
    prazo_execucao_meses: 8, validade: 46161,
    custo_terceiros: 42000, despesas_diretas: 9800,
    ha_faturamento_direto: true, valor_faturamento_direto: 53760,
    valor_proposto: 257280, status: "vigente" as const,
    aprovado_por: "HOC-002", data_aprovacao: 46108,
    justificativa_abaixo_minima:
      "Fechamento 3,2% abaixo do preço mínimo autorizado. Aprovado por DT e DE " +
      "em conjunto: contrato de entrada no município, com dois projetos " +
      "subsequentes já sinalizados pela Secretaria de Obras.",
    economico: {
      custo_hh_proprio: 132260, custo_total: 142060,
      custo_faturamento_direto: 42000,
      bdi_cheio: 0.4, bdi_reduzido: 0.28,
      margem_valor: 24826.4, margem_pct: 0.121985,
      alcada: "DT + DE (abaixo da margem mínima)",
    },
  },
  {
    oportunidade: "OP-I-0309", numero: 0, data_emissao: 46072,
    motivo: "REV-00", o_que_mudou: "Proposta original.",
    regime_preco: "REG-01", criterio_medicao: "MED-02", modalidade: "MOD-02",
    base_pagamento: "PAG-02", prazo_pagamento_dias: 45,
    prazo_execucao_meses: 10, validade: 46132,
    exige_caucao: true, pct_caucao: 0.05, prazo_devolucao_dias: 90,
    custo_terceiros: 96000, despesas_diretas: 14500,
    ha_faturamento_direto: true, valor_faturamento_direto: 58000,
    valor_proposto: 612000, status: "vigente" as const,
    aprovado_por: "HOC-001", data_aprovacao: 46106,
    economico: {
      custo_hh_proprio: 290980, custo_total: 343480,
      custo_faturamento_direto: 58000,
      bdi_cheio: 0.4, bdi_reduzido: 0.28,
      margem_valor: 110800, margem_pct: 0.2,
      alcada: "DT + DE",
    },
  },
];

/** HH previsto por revisão — mesma composição que virou baseline no TAP. */
export const REVISAO_HH: Record<string, ItemHH[]> = {
  "OP-I-0308/1": [
    { etapa: "Mobilização e levantamento cadastral", cargo: "CAR-02", nivel: 1, hh: 480, origem: "Própria" },
    { etapa: "Projeto de drenagem", cargo: "CAR-05", nivel: 2, hh: 900, origem: "Própria" },
    { etapa: "Projeto de pavimentação", cargo: "CAR-05", nivel: 2, hh: 700, origem: "Própria" },
    { etapa: "Detalhamento e pranchas", cargo: "CAR-04", nivel: 2, hh: 1400, origem: "Própria" },
    { etapa: "Coordenação", cargo: "CAR-08", nivel: 2, hh: 560, origem: "Própria" },
    { etapa: "Direção técnica", cargo: "CAR-11", nivel: 3, hh: 40, origem: "Própria" },
    { etapa: "Sondagem e ensaios", cargo: "CAR-05", nivel: 3, hh: 96, origem: "Terceirizada" },
  ],
  "OP-I-0309/0": [
    { etapa: "Cálculo de volumes", cargo: "CAR-05", nivel: 3, hh: 200, origem: "Própria" },
    { etapa: "Projeto de drenagem", cargo: "CAR-05", nivel: 2, hh: 260, origem: "Própria" },
    { etapa: "Detalhamento", cargo: "CAR-04", nivel: 2, hh: 420, origem: "Própria" },
    { etapa: "Apoio topográfico", cargo: "CAR-02", nivel: 2, hh: 160, origem: "Terceirizada" },
    { etapa: "Coordenação", cargo: "CAR-08", nivel: 3, hh: 140, origem: "Própria" },
    { etapa: "Direção técnica", cargo: "CAR-11", nivel: 3, hh: 24, origem: "Própria" },
  ],
};

export type ItemHH = {
  etapa: string; cargo: string; nivel: number; hh: number;
  origem: "Própria" | "Terceirizada";
};

export const PROJETOS = [
  {
    codigo: "I-0245", codigo_contrato: "I-0245-01",
    oportunidade: "OP-I-0308", revisao: "OP-I-0308/1",
    grupo: "I", cliente: "CLI-0001", objeto: OBJETO_0245,
    especialidade: "ESP-01", municipio: "Agudos", uf: "SP",
    escopo_resumido:
      "Projeto executivo completo de drenagem e pavimentação de 3,2 km de vias " +
      "do Distrito Industrial II, incluindo levantamento cadastral, " +
      "dimensionamento e detalhamento executivo.",
    entregas:
      "Memorial descritivo; planilha de quantitativos; 78 pranchas executivas; " +
      "ART recolhida",
    exclusoes:
      "Não inclui execução de obra, licenciamento ambiental nem projeto de " +
      "sinalização viária",
    premissas:
      "Levantamento topográfico fornecido pela contratante até 15 dias do " +
      "início. Sondagens em 12 pontos conforme escopo — pontos adicionais são " +
      "aditivo. Aprovações municipais por conta da contratante.",
    data_assinatura: 46114, data_inicio: 46125, prazo_meses: 8,
    valor_contrato: 257280,
    regime_preco: "REG-02", criterio_medicao: "MED-03", base_pagamento: "PAG-01",
    prazo_pagamento_dias: 30, exige_caucao: false, pct_caucao: 0,
    coordenador: "HOC-005", gerencia: "HOC-003",
    interface_cliente: "Eng. Marcos Vinícius — reuniões na sede da Prefeitura",
    periodicidade: "PRD-03", data_tap: 46122, status: "STP-02",
    economico: {
      valor_faturamento_direto: 53760,
      custo_orcado_hh: 132260, custo_orcado_terceiros: 42000,
      custo_orcado_despesas: 9800, custo_faturamento_direto: 42000,
    },
  },
  {
    codigo: "I-0246", codigo_contrato: "I-0246-01",
    oportunidade: "OP-I-0309", revisao: "OP-I-0309/0",
    grupo: "I", cliente: "CLI-0002", objeto: OBJETO_0246,
    especialidade: "ESP-01", municipio: "São José do Rio Preto", uf: "SP",
    escopo_resumido:
      "Projeto de terraplenagem e drenagem do loteamento, com cálculo de " +
      "volumes, dimensionamento da rede e detalhamento executivo.",
    entregas:
      "Projeto de terraplenagem; projeto de drenagem; memorial de cálculo de " +
      "volumes; pranchas executivas",
    exclusoes:
      "Não inclui projeto de pavimentação, rede de água e esgoto nem " +
      "acompanhamento de obra",
    premissas:
      "Volumes de movimentação de terra conforme levantamento fornecido pela " +
      "contratante. Volume excedente ao previsto constitui aditivo — ver " +
      "I-0246-02. Locação de equipamento de topografia faturada diretamente à " +
      "contratante.",
    data_assinatura: 46111, data_inicio: 46118, prazo_meses: 10,
    valor_contrato: 612000,
    regime_preco: "REG-01", criterio_medicao: "MED-02", base_pagamento: "PAG-02",
    prazo_pagamento_dias: 45, exige_caucao: true, pct_caucao: 0.05,
    coordenador: "HOC-006", gerencia: "HOC-003",
    interface_cliente: "Eng. Patrícia Duarte — reuniões quinzenais on-line",
    periodicidade: "PRD-02", data_tap: 46115, status: "STP-02",
    economico: {
      valor_faturamento_direto: 58000,
      custo_orcado_hh: 290980, custo_orcado_terceiros: 96000,
      custo_orcado_despesas: 14500, custo_faturamento_direto: 58000,
    },
  },
];

export const EQUIPE = [
  { projeto: "I-0245", pessoa: "HOC-005", papel: "PEQ-01", especialidade: "ESP-01", entrada: 46125 },
  { projeto: "I-0245", pessoa: "HOC-007", papel: "PEQ-02", especialidade: "ESP-01", entrada: 46125 },
  { projeto: "I-0245", pessoa: "HOC-009", papel: "PEQ-03", especialidade: "ESP-01", entrada: 46132 },
  { projeto: "I-0245", pessoa: "HOC-001", papel: "PEQ-04", especialidade: "ESP-01", entrada: 46125 },
  { projeto: "I-0246", pessoa: "HOC-006", papel: "PEQ-01", especialidade: "ESP-01", entrada: 46118 },
  { projeto: "I-0246", pessoa: "HOC-008", papel: "PEQ-02", especialidade: "ESP-01", entrada: 46118 },
  { projeto: "I-0246", pessoa: "HOC-010", papel: "PEQ-03", especialidade: "ESP-01", entrada: 46146 },
];

export const MARCOS = [
  { projeto: "I-0245", numero: 1, descricao: "Levantamento cadastral concluído", prevista: 46157, real: 46162, status: "STC-03" },
  { projeto: "I-0245", numero: 2, descricao: "Projeto de drenagem — versão para aprovação", prevista: 46218, real: 46234, status: "STC-03" },
  { projeto: "I-0245", numero: 3, descricao: "Projeto de pavimentação — versão para aprovação", prevista: 46280, real: null, status: "STC-02" },
  { projeto: "I-0245", numero: 4, descricao: "Entrega final do executivo", prevista: 46369, real: null, status: "STC-01" },
  { projeto: "I-0246", numero: 1, descricao: "Cálculo de volumes validado", prevista: 46171, real: 46181, status: "STC-03" },
  { projeto: "I-0246", numero: 2, descricao: "Projeto de drenagem concluído", prevista: 46248, real: null, status: "STC-04" },
  { projeto: "I-0246", numero: 3, descricao: "Entrega final", prevista: 46424, real: null, status: "STC-01" },
];

export const RISCOS = [
  { projeto: "I-0245", numero: 1,
    descricao: "Atraso da contratante na entrega do levantamento topográfico",
    probabilidade: "Média", impacto: "Alta",
    acao: "Notificar formalmente no 10º dia e registrar impacto no cronograma",
    responsavel: "HOC-005", situacao: "Aberto" },
  { projeto: "I-0245", numero: 2,
    descricao: "Necessidade de pontos de sondagem além dos 12 previstos",
    probabilidade: "Média", impacto: "Média",
    acao: "Registrar como aditivo antes de executar; não absorver no escopo",
    responsavel: "HOC-005", situacao: "Aberto" },
  { projeto: "I-0246", numero: 1,
    descricao: "Volume de terra excedente ao levantamento da contratante",
    probabilidade: "Alta", impacto: "Alta",
    acao: "Aditivo I-0246-02 em negociação; medir volumes semanalmente",
    responsavel: "HOC-006", situacao: "Em tratamento" },
  { projeto: "I-0246", numero: 2,
    descricao: "Prazo de pagamento de 45 dias com retenção de 5%",
    probabilidade: "Média", impacto: "Média",
    acao: "Acompanhar no fluxo de caixa; escalar ao GCM se houver atraso",
    responsavel: "HOC-003", situacao: "Aberto" },
];

export const MEDICOES_FISICAS = [
  { projeto: "I-0245", numero: 1, periodo: 46143, apuracao: 46173, pct: 0.12, descricao: "Levantamento cadastral e início da drenagem", atestada_por: "HOC-005", atesto: 46175, status: "STM-03", enviada: 46176 },
  { projeto: "I-0245", numero: 2, periodo: 46174, apuracao: 46203, pct: 0.28, descricao: "Drenagem em desenvolvimento e detalhamento", atestada_por: "HOC-005", atesto: 46205, status: "STM-03", enviada: 46205 },
  { projeto: "I-0245", numero: 3, periodo: 46204, apuracao: 46234, pct: 0.46, descricao: "Drenagem concluída para aprovação", atestada_por: "HOC-005", atesto: 46237, status: "STM-03", enviada: 46238 },
  { projeto: "I-0245", numero: 4, periodo: 46235, apuracao: 46265, pct: 0.58, descricao: "Início da pavimentação e detalhamento", atestada_por: "HOC-005", atesto: 46267, status: "STM-02", enviada: 46268 },
  { projeto: "I-0246", numero: 1, periodo: 46143, apuracao: 46173, pct: 0.14, descricao: "Cálculo de volumes", atestada_por: "HOC-006", atesto: 46176, status: "STM-03", enviada: 46177 },
  { projeto: "I-0246", numero: 2, periodo: 46174, apuracao: 46203, pct: 0.29, descricao: "Drenagem em desenvolvimento", atestada_por: "HOC-006", atesto: 46206, status: "STM-03", enviada: 46209 },
  { projeto: "I-0246", numero: 3, periodo: 46204, apuracao: 46234, pct: 0.41, descricao: "Detalhamento inicial", atestada_por: "HOC-006", atesto: 46238, status: "STM-04", enviada: 46239 },
  { projeto: "I-0246", numero: 4, periodo: 46235, apuracao: 46265, pct: 0.52, descricao: "Detalhamento em andamento", atestada_por: "HOC-006", atesto: 46267, status: "STM-02", enviada: 46268 },
];

/* ------------------------- RESTRITO daqui para baixo ------------------ */

export const MEDICOES_FINANCEIRAS = [
  { projeto: "I-0245", medicao: 1, pct_periodo: 0.12, bruto: 30873.6, glosa: 0, aprovado: 30873.6, aprovacao: 46175 },
  { projeto: "I-0245", medicao: 2, pct_periodo: 0.16, bruto: 41164.8, glosa: 0, aprovado: 41164.8, aprovacao: 46205 },
  { projeto: "I-0245", medicao: 3, pct_periodo: 0.18, bruto: 46310.4, glosa: 0, aprovado: 46310.4, aprovacao: 46237 },
  { projeto: "I-0245", medicao: 4, pct_periodo: 0.12, bruto: 30873.6, glosa: 0, aprovado: 30873.6, aprovacao: null },
  { projeto: "I-0246", medicao: 1, pct_periodo: 0.14, bruto: 85680, glosa: 0, aprovado: 85680, aprovacao: 46176 },
  { projeto: "I-0246", medicao: 2, pct_periodo: 0.15, bruto: 91800, glosa: 0, aprovado: 91800, aprovacao: 46206 },
  { projeto: "I-0246", medicao: 3, pct_periodo: 0.12, bruto: 73440, glosa: 9800, aprovado: 63640, aprovacao: 46238 },
  { projeto: "I-0246", medicao: 4, pct_periodo: 0.11, bruto: 67320, glosa: 0, aprovado: 67320, aprovacao: null },
];

export const FATURAMENTOS = [
  { projeto: "I-0245", medicao: 1, nf: "NF 1042", emissao: 46176, valor: 30873.6, retencao: 0, prazo: 30, recebimento: 46209, recebido: 30873.6 },
  { projeto: "I-0245", medicao: 2, nf: "NF 1078", emissao: 46206, valor: 41164.8, retencao: 0, prazo: 30, recebimento: 46238, recebido: 41164.8 },
  { projeto: "I-0245", medicao: 3, nf: "NF 1119", emissao: 46238, valor: 46310.4, retencao: 0, prazo: 30, recebimento: null, recebido: null },
  { projeto: "I-0246", medicao: 1, nf: "NF 1051", emissao: 46178, valor: 85680, retencao: 0.05, prazo: 45, recebimento: 46227, recebido: 81396 },
  { projeto: "I-0246", medicao: 2, nf: "NF 1084", emissao: 46209, valor: 91800, retencao: 0.05, prazo: 45, recebimento: 46259, recebido: 87210 },
  { projeto: "I-0246", medicao: 3, nf: "NF 1121", emissao: 46240, valor: 63640, retencao: 0.05, prazo: 45, recebimento: null, recebido: null },
];

/** Custo horário por função e nível. Vigência de 01/01/2026 em diante. */
export const CUSTOS_RECURSO = [
  { funcao: "FUN-01", nivel: 1, valor: 14.4 },
  { funcao: "FUN-02", nivel: 1, valor: 31.3 },
  { funcao: "FUN-03", nivel: 1, valor: 50.0 },
  { funcao: "FUN-04", nivel: 1, valor: 75.0 },
  { funcao: "FUN-05", nivel: 1, valor: 125.0 },
  { funcao: "FUN-01", nivel: 2, valor: 18.8 },
  { funcao: "FUN-02", nivel: 2, valor: 37.5 },
  { funcao: "FUN-03", nivel: 2, valor: 56.3 },
  { funcao: "FUN-04", nivel: 2, valor: 93.8 },
  { funcao: "FUN-05", nivel: 2, valor: 156.3 },
  { funcao: "FUN-01", nivel: 3, valor: 23.8 },
  { funcao: "FUN-02", nivel: 3, valor: 43.8 },
  { funcao: "FUN-03", nivel: 3, valor: 62.5 },
  { funcao: "FUN-04", nivel: 3, valor: 112.5 },
  { funcao: "FUN-05", nivel: 3, valor: 187.5 },
];

export const VIGENCIA_CUSTO_INICIO = 46023; // 01/01/2026

/**
 * HH realizado por mês, pessoa e etapa (aba HH_REALIZADO). O apontamento do
 * sistema é diário, então o seed distribui cada total pelos dias úteis do mês,
 * no máximo 8 h por dia.
 */
export const HH_REALIZADO = [
  { projeto: "I-0245", mes: 46113, pessoa: "HOC-005", hh: 92, etapa: "Coordenação" },
  { projeto: "I-0245", mes: 46113, pessoa: "HOC-007", hh: 148, etapa: "Projeto de drenagem" },
  { projeto: "I-0245", mes: 46143, pessoa: "HOC-007", hh: 164, etapa: "Projeto de drenagem" },
  { projeto: "I-0245", mes: 46143, pessoa: "HOC-009", hh: 180, etapa: "Detalhamento e pranchas" },
  { projeto: "I-0245", mes: 46174, pessoa: "HOC-007", hh: 172, etapa: "Projeto de pavimentação" },
  { projeto: "I-0245", mes: 46174, pessoa: "HOC-009", hh: 188, etapa: "Detalhamento e pranchas" },
  { projeto: "I-0245", mes: 46204, pessoa: "HOC-009", hh: 176, etapa: "Detalhamento e pranchas" },
  { projeto: "I-0245", mes: 46204, pessoa: "HOC-005", hh: 84, etapa: "Coordenação" },
  { projeto: "I-0245", mes: 46235, pessoa: "HOC-007", hh: 158, etapa: "Projeto de pavimentação" },
  { projeto: "I-0245", mes: 46235, pessoa: "HOC-009", hh: 194, etapa: "Detalhamento e pranchas" },
  { projeto: "I-0246", mes: 46113, pessoa: "HOC-006", hh: 76, etapa: "Coordenação" },
  { projeto: "I-0246", mes: 46143, pessoa: "HOC-008", hh: 168, etapa: "Cálculo de volumes" },
  { projeto: "I-0246", mes: 46174, pessoa: "HOC-008", hh: 172, etapa: "Projeto de drenagem" },
  { projeto: "I-0246", mes: 46204, pessoa: "HOC-010", hh: 184, etapa: "Detalhamento" },
  { projeto: "I-0246", mes: 46235, pessoa: "HOC-010", hh: 176, etapa: "Detalhamento" },
];
