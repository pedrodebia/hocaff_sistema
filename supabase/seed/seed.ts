/**
 * Seed de desenvolvimento.
 *
 *   npm run seed
 *
 * Usa a chave de serviço e portanto IGNORA a RLS — é o único jeito de montar
 * o cenário. Não rode isto contra produção: ele apaga e recria os dois
 * projetos de exemplo e os clientes deles.
 *
 * É idempotente: rodar de novo devolve o banco ao mesmo estado.
 */

import { config } from "dotenv";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  deSerial, SENHA_DEV, PESSOAS, CLIENTES, OPORTUNIDADES, REVISOES, REVISAO_HH,
  PROJETOS, EQUIPE, MARCOS, RISCOS, MEDICOES_FISICAS, MEDICOES_FINANCEIRAS,
  FATURAMENTOS, CUSTOS_RECURSO, VIGENCIA_CUSTO_INICIO, HH_REALIZADO,
} from "./dados";

config({ path: ".env.local", quiet: true });

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const CHAVE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !CHAVE) {
  console.error(
    "Faltam NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em .env.local",
  );
  process.exit(1);
}

const db: SupabaseClient = createClient(URL, CHAVE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function conferir<T>(
  rotulo: string,
  r: { data: T; error: { message: string } | null },
): NonNullable<T> {
  if (r.error) {
    console.error(`\n✖ ${rotulo}: ${r.error.message}`);
    process.exit(1);
  }
  if (r.data === null || r.data === undefined) {
    console.error(`\n✖ ${rotulo}: o banco não devolveu linha nenhuma.`);
    process.exit(1);
  }
  return r.data as NonNullable<T>;
}

const passo = (t: string) => console.log(`\n▸ ${t}`);
const ok = (t: string) => console.log(`  ✓ ${t}`);

/* ------------------------------ taxonomias ---------------------------- */

type Chave = `${string}/${string}`;
const taxonomia = new Map<Chave, string>();

async function carregarTaxonomias() {
  const linhas = conferir(
    "ler taxonomia_item",
    await db.from("taxonomia_item").select("id, tipo, codigo"),
  );
  for (const l of linhas) taxonomia.set(`${l.tipo}/${l.codigo}`, l.id);
  ok(`${linhas.length} itens de taxonomia carregados`);
}

function tax(tipo: string, codigo: string): string {
  const id = taxonomia.get(`${tipo}/${codigo}`);
  if (!id) {
    console.error(
      `\n✖ Taxonomia ${tipo}/${codigo} não existe. As migrações 0001 e 0002 foram aplicadas?`,
    );
    process.exit(1);
  }
  return id;
}

/* ------------------------------- pessoas ------------------------------ */

const pessoaId = new Map<string, string>(); // matrícula → uuid

async function semearPessoas() {
  passo("Pessoas e contas de acesso");

  // Um único levantamento das contas existentes, para não criar duplicata.
  const existentes = new Map<string, string>();
  for (let pagina = 1; ; pagina++) {
    const { data, error } = await db.auth.admin.listUsers({ page: pagina, perPage: 200 });
    if (error) {
      console.error(`\n✖ listar usuários: ${error.message}`);
      process.exit(1);
    }
    for (const u of data.users) if (u.email) existentes.set(u.email, u.id);
    if (data.users.length < 200) break;
  }

  for (const p of PESSOAS) {
    let authId = existentes.get(p.email);

    if (!authId) {
      const { data, error } = await db.auth.admin.createUser({
        email: p.email,
        password: SENHA_DEV,
        email_confirm: true,
        user_metadata: { nome: p.nome, matricula: p.matricula },
      });
      if (error) {
        console.error(`\n✖ criar conta ${p.email}: ${error.message}`);
        process.exit(1);
      }
      authId = data.user.id;
    } else {
      // Garante que a senha de desenvolvimento continua valendo.
      await db.auth.admin.updateUserById(authId, { password: SENHA_DEV });
    }

    const linha = conferir(
      `pessoa ${p.matricula}`,
      await db
        .from("pessoa")
        .upsert(
          {
            matricula: p.matricula,
            nome: p.nome,
            email: p.email,
            auth_user_id: authId,
            cargo_id: tax("cargo", p.cargo),
            nivel: p.nivel,
            tipo_vinculo: p.vinculo,
            especialidade_id: tax("especialidade", p.especialidade),
            admissao: deSerial(p.admissao),
            jornada_mensal: p.jornada,
            aproveitamento: p.aproveitamento,
            ativo: true,
          },
          { onConflict: "matricula" },
        )
        .select("id")
        .single(),
    );

    pessoaId.set(p.matricula, linha.id);

    conferir(
      "limpar papéis",
      await db.from("pessoa_papel").delete().eq("pessoa_id", linha.id).select("papel"),
    );
    conferir(
      "papéis",
      await db
        .from("pessoa_papel")
        .insert(p.papeis.map((papel) => ({ pessoa_id: linha.id, papel })))
        .select("papel"),
    );
  }

  ok(`${PESSOAS.length} pessoas, com conta e papéis`);
}

/* -------------------------------- limpeza ----------------------------- */

async function limparNegocio() {
  passo("Limpando os dados de exemplo anteriores");

  const codigosProjeto = PROJETOS.map((p) => p.codigo);
  const { data: projetos } = await db
    .from("projeto")
    .select("id")
    .in("codigo", codigosProjeto);
  const idsProjeto = (projetos ?? []).map((p) => p.id);

  if (idsProjeto.length) {
    // Ordem manda: faturamento e medição financeira não têm cascade.
    await db.from("faturamento").delete().in("projeto_id", idsProjeto);
    await db.from("medicao_financeira").delete().in("projeto_id", idsProjeto);
    await db.from("apontamento").delete().in("projeto_id", idsProjeto);
    await db.from("projeto_economico").delete().in("projeto_id", idsProjeto);
    await db.from("projeto").delete().in("id", idsProjeto);
  }

  const codigosOp = OPORTUNIDADES.map((o) => o.codigo);
  const { data: ops } = await db.from("oportunidade").select("id").in("codigo", codigosOp);
  const idsOp = (ops ?? []).map((o) => o.id);
  if (idsOp.length) {
    // revisao, revisao_hh e revisao_economico caem por cascade.
    await db.from("oportunidade").delete().in("id", idsOp);
  }

  await db.from("cliente").delete().in("codigo", CLIENTES.map((c) => c.codigo));

  ok("banco pronto para receber o cenário");
}

/* ------------------------------- clientes ----------------------------- */

const clienteId = new Map<string, string>();

async function semearClientes() {
  passo("Clientes");
  for (const c of CLIENTES) {
    const linha = conferir(
      `cliente ${c.codigo}`,
      await db
        .from("cliente")
        .insert({
          codigo: c.codigo,
          nome: c.nome,
          natureza_id: tax("natureza_cliente", c.natureza),
          segmento_id: tax("segmento", c.segmento),
        })
        .select("id")
        .single(),
    );
    clienteId.set(c.codigo, linha.id);
  }
  ok(`${CLIENTES.length} clientes`);
}

/* ------------------------------- funil -------------------------------- */

const oportunidadeId = new Map<string, string>();
const revisaoId = new Map<string, string>();

async function semearFunil() {
  passo("Funil — oportunidades e revisões");

  for (const o of OPORTUNIDADES) {
    const linha = conferir(
      `oportunidade ${o.codigo}`,
      await db
        .from("oportunidade")
        .insert({
          codigo: o.codigo,
          grupo_id: tax("grupo", o.grupo),
          data_entrada: deSerial(o.data_entrada),
          registrado_por: pessoaId.get(o.registrado_por)!,
          cliente_id: clienteId.get(o.cliente)!,
          papel_hocaff_id: tax("papel_hocaff", o.papel_hocaff),
          contato_cliente: o.contato_cliente,
          origem_id: tax("origem_captacao", o.origem),
          captado_por: pessoaId.get(o.captado_por)!,
          objeto: o.objeto,
          tipo_solicitacao_id: tax("tipo_solicitacao", o.tipo_solicitacao),
          especialidade_id: tax("especialidade", o.especialidade),
          municipio: o.municipio,
          uf: o.uf,
          macrorregiao_id: tax("macrorregiao", o.macrorregiao),
          prazo_proposta: deSerial(o.prazo_proposta),
          prazo_execucao_meses: o.prazo_execucao_meses,
          data_qualificacao: deSerial(o.data_qualificacao),
          decisao: o.decisao,
          qualificado_por_1: pessoaId.get(o.qualificado_por_1)!,
          qualificado_por_2: pessoaId.get(o.qualificado_por_2)!,
          crit_fit_tecnico: o.criterios.fit,
          crit_capacidade_hh: o.criterios.capacidade,
          crit_habilitacao: o.criterios.habilitacao,
          crit_prazo_exequivel: o.criterios.prazo,
          crit_risco_cliente: o.criterios.risco,
          crit_valor_estrategico: o.criterios.estrategico,
          estagio: o.estagio,
          data_estagio: deSerial(o.data_estagio),
          data_desfecho: deSerial(o.data_desfecho),
          valor_estimado_inicial: o.valor_estimado_inicial,
          criado_por: pessoaId.get(o.registrado_por)!,
        })
        .select("id")
        .single(),
    );
    oportunidadeId.set(o.codigo, linha.id);
  }

  for (const r of REVISOES) {
    const chave = `${r.oportunidade}/${r.numero}`;
    const linha = conferir(
      `revisão ${chave}`,
      await db
        .from("revisao")
        .insert({
          oportunidade_id: oportunidadeId.get(r.oportunidade)!,
          numero: r.numero,
          data_emissao: deSerial(r.data_emissao),
          motivo_id: tax("motivo_revisao", r.motivo),
          o_que_mudou: r.o_que_mudou,
          regime_preco_id: tax("regime_preco", r.regime_preco),
          criterio_medicao_id: tax("criterio_medicao", r.criterio_medicao),
          modalidade_id: tax("modalidade_execucao", r.modalidade),
          base_pagamento_id: tax("base_pagamento", r.base_pagamento),
          prazo_pagamento_dias: r.prazo_pagamento_dias,
          prazo_execucao_meses: r.prazo_execucao_meses,
          validade: deSerial(r.validade),
          exige_caucao: "exige_caucao" in r ? r.exige_caucao : false,
          pct_caucao: "pct_caucao" in r ? r.pct_caucao : 0,
          prazo_devolucao_dias: "prazo_devolucao_dias" in r ? r.prazo_devolucao_dias : null,
          custo_terceiros: r.custo_terceiros,
          despesas_diretas: r.despesas_diretas,
          ha_faturamento_direto: r.ha_faturamento_direto,
          valor_faturamento_direto: r.valor_faturamento_direto,
          preco_sugerido: precoSugerido(r.economico),
          preco_minimo: precoMinimo(r.economico, r.valor_proposto),
          valor_proposto: r.valor_proposto,
          status: r.status,
          aprovado_por: "aprovado_por" in r ? pessoaId.get(r.aprovado_por as string)! : null,
          data_aprovacao: "data_aprovacao" in r ? deSerial(r.data_aprovacao as number) : null,
          justificativa_abaixo_minima:
            "justificativa_abaixo_minima" in r ? r.justificativa_abaixo_minima : null,
        })
        .select("id")
        .single(),
    );
    revisaoId.set(chave, linha.id);

    // RESTRITO
    conferir(
      `econômico da revisão ${chave}`,
      await db
        .from("revisao_economico")
        .insert({ revisao_id: linha.id, ...r.economico })
        .select("revisao_id"),
    );

    const hh = REVISAO_HH[chave];
    if (hh) {
      conferir(
        `HH da revisão ${chave}`,
        await db
          .from("revisao_hh")
          .insert(
            hh.map((i) => ({
              revisao_id: linha.id,
              etapa: i.etapa,
              cargo_id: tax("cargo", i.cargo),
              nivel: i.nivel,
              hh: i.hh,
              origem: i.origem,
            })),
          )
          .select("id"),
      );
    }
  }

  ok(`${OPORTUNIDADES.length} oportunidades, ${REVISOES.length} revisões`);
}

/* -------------------------- preço, pelas fórmulas --------------------- */

const CARGA_TRIBUTARIA = 0.18; // soma das alíquotas semeadas em 0001

type Economico = {
  custo_total: number;
  custo_faturamento_direto: number;
  bdi_cheio: number | null;
  bdi_reduzido: number | null;
};

/** Preço = custo direto × (1 + BDI). Faturamento direto leva o BDI reduzido. */
function precoSugerido(e: Economico) {
  const hocaff = e.custo_total * (1 + (e.bdi_cheio ?? 0));
  const direto = e.custo_faturamento_direto * (1 + (e.bdi_reduzido ?? 0));
  return Math.round((hocaff + direto) * 100) / 100;
}

/**
 * Preço mínimo = Custo Hocaff / (1 − margem mínima − carga total) + fat. direto.
 * A margem é LÍQUIDA: a carga tributária entra no denominador. Dividir só por
 * (1 − margem) produziria um piso baixo demais.
 */
function precoMinimo(e: Economico, valorProposto: number) {
  const margemMinima = valorProposto > 100_000 ? 0.15 : 0.2;
  const base = e.custo_total / (1 - margemMinima - CARGA_TRIBUTARIA);
  const direto = e.custo_faturamento_direto * (1 + (e.bdi_reduzido ?? 0));
  return Math.round((base + direto) * 100) / 100;
}

/* ------------------------------ projetos ------------------------------ */

const projetoId = new Map<string, string>();
const medicaoFisicaId = new Map<string, string>();

async function semearProjetos() {
  passo("Portfólio — projetos com TAP assinado");

  for (const p of PROJETOS) {
    const linha = conferir(
      `projeto ${p.codigo}`,
      await db
        .from("projeto")
        .insert({
          codigo: p.codigo,
          codigo_contrato: p.codigo_contrato,
          oportunidade_id: oportunidadeId.get(p.oportunidade)!,
          revisao_id: revisaoId.get(p.revisao)!,
          grupo_id: tax("grupo", p.grupo),
          cliente_id: clienteId.get(p.cliente)!,
          objeto: p.objeto,
          especialidade_id: tax("especialidade", p.especialidade),
          municipio: p.municipio,
          uf: p.uf,
          escopo_resumido: p.escopo_resumido,
          entregas: p.entregas,
          exclusoes: p.exclusoes,
          premissas: p.premissas,
          data_assinatura: deSerial(p.data_assinatura),
          data_inicio: deSerial(p.data_inicio),
          prazo_meses: p.prazo_meses,
          valor_contrato: p.valor_contrato,
          regime_preco_id: tax("regime_preco", p.regime_preco),
          criterio_medicao_id: tax("criterio_medicao", p.criterio_medicao),
          base_pagamento_id: tax("base_pagamento", p.base_pagamento),
          prazo_pagamento_dias: p.prazo_pagamento_dias,
          exige_caucao: p.exige_caucao,
          pct_caucao: p.pct_caucao,
          coordenador_id: pessoaId.get(p.coordenador)!,
          gerencia_id: pessoaId.get(p.gerencia)!,
          interface_cliente: p.interface_cliente,
          periodicidade_id: tax("periodicidade", p.periodicidade),
          tap_assinado: true,
          data_tap: deSerial(p.data_tap),
          status_id: tax("status_projeto", p.status),
        })
        .select("id")
        .single(),
    );
    projetoId.set(p.codigo, linha.id);

    // Baseline: cópia congelada do HH da revisão vencedora.
    const hh = REVISAO_HH[p.revisao];
    if (hh) {
      conferir(
        `baseline ${p.codigo}`,
        await db
          .from("projeto_hh_baseline")
          .insert(
            hh.map((i) => ({
              projeto_id: linha.id,
              etapa: i.etapa,
              cargo_id: tax("cargo", i.cargo),
              nivel: i.nivel,
              hh: i.hh,
              origem: i.origem,
            })),
          )
          .select("id"),
      );
    }

    // RESTRITO
    conferir(
      `econômico ${p.codigo}`,
      await db
        .from("projeto_economico")
        .insert({ projeto_id: linha.id, ...p.economico })
        .select("projeto_id"),
    );
  }

  conferir(
    "equipe",
    await db
      .from("projeto_equipe")
      .insert(
        EQUIPE.map((e) => ({
          projeto_id: projetoId.get(e.projeto)!,
          pessoa_id: pessoaId.get(e.pessoa)!,
          papel_id: tax("papel_equipe", e.papel),
          especialidade_id: tax("especialidade", e.especialidade),
          data_entrada: deSerial(e.entrada),
        })),
      )
      .select("id"),
  );

  conferir(
    "marcos",
    await db
      .from("projeto_marco")
      .insert(
        MARCOS.map((m) => ({
          projeto_id: projetoId.get(m.projeto)!,
          numero: m.numero,
          descricao: m.descricao,
          data_prevista: deSerial(m.prevista),
          data_real: m.real ? deSerial(m.real) : null,
          status_id: tax("status_marco", m.status),
        })),
      )
      .select("id"),
  );

  conferir(
    "riscos",
    await db
      .from("projeto_risco")
      .insert(
        RISCOS.map((r) => ({
          projeto_id: projetoId.get(r.projeto)!,
          numero: r.numero,
          descricao: r.descricao,
          probabilidade: r.probabilidade,
          impacto: r.impacto,
          acao: r.acao,
          responsavel_id: pessoaId.get(r.responsavel)!,
          situacao: r.situacao,
        })),
      )
      .select("id"),
  );

  const medicoes = conferir(
    "medições físicas",
    await db
      .from("medicao_fisica")
      .insert(
        MEDICOES_FISICAS.map((m) => ({
          projeto_id: projetoId.get(m.projeto)!,
          numero: m.numero,
          periodo: deSerial(m.periodo),
          data_apuracao: deSerial(m.apuracao),
          pct_acumulado: m.pct,
          descricao: m.descricao,
          atestada_por: pessoaId.get(m.atestada_por)!,
          data_atesto: deSerial(m.atesto),
          status_id: tax("status_medicao", m.status),
          enviada_gcm_em: deSerial(m.enviada),
        })),
      )
      .select("id, projeto_id, numero"),
  );

  for (const m of medicoes) {
    const codigo = [...projetoId.entries()].find(([, id]) => id === m.projeto_id)?.[0];
    medicaoFisicaId.set(`${codigo}/${m.numero}`, m.id);
  }

  ok(
    `${PROJETOS.length} projetos, ${EQUIPE.length} alocações, ${MARCOS.length} marcos, ` +
      `${RISCOS.length} riscos, ${MEDICOES_FISICAS.length} medições físicas`,
  );
}

/* --------------------------- lado restrito ---------------------------- */

async function semearRestrito() {
  passo("Lado restrito — custo, medição financeira e faturamento");

  const inicio = deSerial(VIGENCIA_CUSTO_INICIO);

  // Só as linhas desta vigência, para não tocar em histórico real.
  await db.from("custo_recurso").delete().eq("vigencia_inicio", inicio);

  conferir(
    "custo_recurso",
    await db
      .from("custo_recurso")
      .insert(
        CUSTOS_RECURSO.map((c) => ({
          funcao_id: tax("funcao", c.funcao),
          nivel: c.nivel,
          valor_hora: c.valor,
          vigencia_inicio: inicio,
        })),
      )
      .select("id"),
  );

  const financeiras = conferir(
    "medição financeira",
    await db
      .from("medicao_financeira")
      .insert(
        MEDICOES_FINANCEIRAS.map((m) => ({
          medicao_fisica_id: medicaoFisicaId.get(`${m.projeto}/${m.medicao}`)!,
          projeto_id: projetoId.get(m.projeto)!,
          pct_periodo: m.pct_periodo,
          valor_bruto: m.bruto,
          glosa: m.glosa,
          valor_aprovado: m.aprovado,
          data_aprovacao: m.aprovacao ? deSerial(m.aprovacao) : null,
        })),
      )
      .select("id, projeto_id"),
  );

  const chaveFinanceira = new Map<string, string>();
  MEDICOES_FINANCEIRAS.forEach((m, i) => {
    chaveFinanceira.set(`${m.projeto}/${m.medicao}`, financeiras[i].id);
  });

  conferir(
    "faturamento",
    await db
      .from("faturamento")
      .insert(
        FATURAMENTOS.map((f) => ({
          medicao_financeira_id: chaveFinanceira.get(`${f.projeto}/${f.medicao}`)!,
          projeto_id: projetoId.get(f.projeto)!,
          nota_fiscal: f.nf,
          data_emissao: deSerial(f.emissao),
          valor_nf: f.valor,
          pct_retencao: f.retencao,
          prazo_dias: f.prazo,
          data_recebimento: f.recebimento ? deSerial(f.recebimento) : null,
          valor_recebido: f.recebido,
        })),
      )
      .select("id"),
  );

  ok(
    `${CUSTOS_RECURSO.length} custos horários, ${MEDICOES_FINANCEIRAS.length} medições ` +
      `financeiras, ${FATURAMENTOS.length} faturamentos`,
  );
}

/* ------------------------------ timesheet ----------------------------- */

/** Distribui um total mensal pelos dias úteis do mês, no máximo 8 h por dia. */
function distribuir(mesISO: string, total: number): { data: string; horas: number }[] {
  const [ano, mes] = mesISO.split("-").map(Number);
  const dias: string[] = [];
  const ultimo = new Date(Date.UTC(ano, mes, 0)).getUTCDate();

  for (let d = 1; d <= ultimo; d++) {
    const dia = new Date(Date.UTC(ano, mes - 1, d));
    const semana = dia.getUTCDay();
    if (semana !== 0 && semana !== 6) dias.push(dia.toISOString().slice(0, 10));
  }

  const lancamentos: { data: string; horas: number }[] = [];
  let restante = total;
  for (const dia of dias) {
    if (restante <= 0) break;
    const horas = Math.min(8, restante);
    lancamentos.push({ data: dia, horas: Math.round(horas * 100) / 100 });
    restante -= horas;
  }

  if (restante > 0) {
    // Mês curto para o volume apontado: sobra vai no último dia útil.
    const ultimoLancamento = lancamentos[lancamentos.length - 1];
    ultimoLancamento.horas = Math.round((ultimoLancamento.horas + restante) * 100) / 100;
  }

  return lancamentos;
}

async function semearApontamentos() {
  passo("Timesheet — apontamentos");

  const linhas = HH_REALIZADO.flatMap((h) =>
    distribuir(deSerial(h.mes), h.hh).map((l) => ({
      pessoa_id: pessoaId.get(h.pessoa)!,
      data: l.data,
      projeto_id: projetoId.get(h.projeto)!,
      etapa: h.etapa,
      horas: l.horas,
    })),
  );

  conferir("apontamentos", await db.from("apontamento").insert(linhas).select("id"));

  const totalHH = HH_REALIZADO.reduce((s, h) => s + h.hh, 0);
  ok(`${linhas.length} lançamentos diários, somando ${totalHH} h`);
}

/* -------------------------------- fim --------------------------------- */

async function principal() {
  console.log(`\nSeed Hocaff → ${URL}`);

  await carregarTaxonomias();
  await semearPessoas();
  await limparNegocio();
  await semearClientes();
  await semearFunil();
  await semearProjetos();
  await semearRestrito();
  await semearApontamentos();

  console.log(`\n✓ Seed concluído.`);
  console.log(`  Senha de desenvolvimento para todas as contas: ${SENHA_DEV}`);
  console.log(`  Diretoria de Engenharia (DE): ${PESSOAS[0].email}`);
  console.log(`  Coordenação de Projetos (CPR): ${PESSOAS[4].email}`);
  console.log(`  Gestão de Custos e Medições (GCM): ${PESSOAS[11].email}\n`);
}

principal().catch((e) => {
  console.error(e);
  process.exit(1);
});
