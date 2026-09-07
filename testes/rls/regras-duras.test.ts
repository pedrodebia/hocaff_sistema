import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { admin, criarAtor, removerAtor, type Ator } from "./ajuda";

/**
 * As regras de negócio que o CLAUDE.md chama de inegociáveis. Se elas moram na
 * aplicação, um dia alguém chama a API direto e passa por cima. Estes testes
 * confirmam que elas moram no banco.
 */

let cnn: Ator;      // escreve no funil
let gcm: Ator;      // escreve no lado restrito
let coordenador: Ator;
const oportunidadesCriadas: string[] = [];
let base: Record<string, string>;

async function taxonomia(tipo: string) {
  const { data } = await admin
    .from("taxonomia_item")
    .select("id")
    .eq("tipo", tipo)
    .limit(1)
    .single();
  return data!.id as string;
}

beforeAll(async () => {
  cnn = await criarAtor(["CNN"]);
  gcm = await criarAtor(["GCM"]);
  coordenador = await criarAtor(["CPR"]);

  const { data: cliente } = await admin.from("cliente").select("id").limit(1).single();
  if (!cliente) throw new Error('Sem cliente. Rode "npm run seed".');

  base = {
    grupo_id: await taxonomia("grupo"),
    origem_id: await taxonomia("origem_captacao"),
    tipo_solicitacao_id: await taxonomia("tipo_solicitacao"),
    motivo_perda_id: await taxonomia("motivo_perda"),
    cliente_id: cliente.id,
    registrado_por: cnn.pessoaId,
  };
}, 120_000);

afterAll(async () => {
  if (oportunidadesCriadas.length) {
    await admin.from("oportunidade").delete().in("id", oportunidadesCriadas);
  }
  for (const a of [cnn, gcm, coordenador]) await removerAtor(a);
}, 120_000);

function novaOportunidade(extra: Record<string, unknown> = {}) {
  return {
    codigo: `OP-TESTE-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    grupo_id: base.grupo_id,
    cliente_id: base.cliente_id,
    registrado_por: base.registrado_por,
    origem_id: base.origem_id,
    tipo_solicitacao_id: base.tipo_solicitacao_id,
    objeto: "Oportunidade criada por teste automatizado",
    ...extra,
  };
}

describe("regra 2 — a qualificação exige duas pessoas, e pessoas diferentes", () => {
  it("estágio 0 não precisa de assinatura nenhuma", async () => {
    const { data, error } = await cnn.db
      .from("oportunidade")
      .insert(novaOportunidade({ estagio: 0 }))
      .select("id")
      .single();
    expect(error).toBeNull();
    oportunidadesCriadas.push(data!.id);
  });

  it("estágio 1 com uma assinatura só é recusado", async () => {
    const { error } = await cnn.db.from("oportunidade").insert(
      novaOportunidade({
        estagio: 1,
        decisao: "Go",
        qualificado_por_1: cnn.pessoaId,
      }),
    );
    expect(error).not.toBeNull();
  });

  it("estágio 1 com a mesma pessoa duas vezes é recusado", async () => {
    const { error } = await cnn.db.from("oportunidade").insert(
      novaOportunidade({
        estagio: 1,
        decisao: "Go",
        qualificado_por_1: cnn.pessoaId,
        qualificado_por_2: cnn.pessoaId,
      }),
    );
    expect(error).not.toBeNull();
  });

  it("estágio 1 com duas pessoas distintas passa", async () => {
    const { data, error } = await cnn.db
      .from("oportunidade")
      .insert(
        novaOportunidade({
          estagio: 1,
          decisao: "Go",
          qualificado_por_1: cnn.pessoaId,
          qualificado_por_2: coordenador.pessoaId,
        }),
      )
      .select("id")
      .single();
    expect(error).toBeNull();
    oportunidadesCriadas.push(data!.id);
  });
});

describe("regra 3 — perda exige motivo", () => {
  it("estágio 6 sem motivo é recusado", async () => {
    const { error } = await cnn.db.from("oportunidade").insert(
      novaOportunidade({
        estagio: 6,
        qualificado_por_1: cnn.pessoaId,
        qualificado_por_2: coordenador.pessoaId,
      }),
    );
    expect(error).not.toBeNull();
  });

  it("estágio 6 com motivo passa", async () => {
    const { data, error } = await cnn.db
      .from("oportunidade")
      .insert(
        novaOportunidade({
          estagio: 6,
          qualificado_por_1: cnn.pessoaId,
          qualificado_por_2: coordenador.pessoaId,
          motivo_perda_id: base.motivo_perda_id,
        }),
      )
      .select("id")
      .single();
    expect(error).toBeNull();
    oportunidadesCriadas.push(data!.id);
  });

  it("No-Go sem motivo escrito é recusado", async () => {
    const { error } = await cnn.db.from("oportunidade").insert(
      novaOportunidade({
        estagio: 8,
        decisao: "No-Go",
        qualificado_por_1: cnn.pessoaId,
        qualificado_por_2: coordenador.pessoaId,
      }),
    );
    expect(error).not.toBeNull();
  });
});

describe("regra 10 — uma só revisão vigente por oportunidade", () => {
  it("a segunda revisão vigente é recusada", async () => {
    const { data: op } = await cnn.db
      .from("oportunidade")
      .insert(
        novaOportunidade({
          estagio: 3,
          qualificado_por_1: cnn.pessoaId,
          qualificado_por_2: coordenador.pessoaId,
        }),
      )
      .select("id")
      .single();
    oportunidadesCriadas.push(op!.id);

    const primeira = await cnn.db.from("revisao").insert({
      oportunidade_id: op!.id,
      numero: 0,
      data_emissao: "2026-05-01",
      status: "vigente",
    });
    expect(primeira.error).toBeNull();

    const segunda = await cnn.db.from("revisao").insert({
      oportunidade_id: op!.id,
      numero: 1,
      data_emissao: "2026-06-01",
      status: "vigente",
    });
    expect(segunda.error).not.toBeNull();

    // A anterior vira 'substituida' e aí a nova entra. Nada é sobrescrito.
    await cnn.db
      .from("revisao")
      .update({ status: "substituida" })
      .eq("oportunidade_id", op!.id)
      .eq("numero", 0);

    const terceira = await cnn.db.from("revisao").insert({
      oportunidade_id: op!.id,
      numero: 1,
      data_emissao: "2026-06-01",
      status: "vigente",
    });
    expect(terceira.error).toBeNull();
  });
});

describe("regra 11 — vigência de custo não se sobrepõe", () => {
  it("duas vigências abertas para a mesma função e nível são recusadas", async () => {
    const { data: funcao } = await admin
      .from("taxonomia_item")
      .select("id")
      .eq("tipo", "funcao")
      .limit(1)
      .single();

    const primeira = await gcm.db
      .from("custo_recurso")
      .insert({
        funcao_id: funcao!.id,
        nivel: 3,
        valor_hora: 999.99,
        vigencia_inicio: "2030-01-01",
        vigencia_fim: "2030-12-31",
      })
      .select("id")
      .single();
    expect(primeira.error).toBeNull();

    const segunda = await gcm.db.from("custo_recurso").insert({
      funcao_id: funcao!.id,
      nivel: 3,
      valor_hora: 888.88,
      vigencia_inicio: "2030-06-01",
      vigencia_fim: "2031-06-01",
    });
    expect(segunda.error).not.toBeNull();

    await admin.from("custo_recurso").delete().eq("id", primeira.data!.id);
  });
});

describe("escrita no funil é de Novos Negócios e da Diretoria", () => {
  it("Coordenador de Projetos não cria oportunidade", async () => {
    const { error } = await coordenador.db
      .from("oportunidade")
      .insert(novaOportunidade({ estagio: 0 }));
    expect(error).not.toBeNull();
  });
});
