import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { admin, criarAtor, removerAtor, type Ator } from "./ajuda";

/**
 * Taxonomia e parâmetro são a política da empresa em forma de dado. Quem edita
 * é a Diretoria — e quem garante isso é a policy, não o menu escondido.
 */

let diretor: Ator;
let coordenador: Ator;
const criados: string[] = [];
const chavesCriadas: string[] = [];

beforeAll(async () => {
  diretor = await criarAtor(["DE"]);
  coordenador = await criarAtor(["CPR"]);
}, 120_000);

afterAll(async () => {
  if (criados.length) await admin.from("taxonomia_item").delete().in("id", criados);
  if (chavesCriadas.length) await admin.from("parametro").delete().in("chave", chavesCriadas);
  await removerAtor(diretor);
  await removerAtor(coordenador);
}, 120_000);

describe("taxonomia", () => {
  it("qualquer pessoa autenticada lê — os seletores dependem disso", async () => {
    const { data, error } = await coordenador.db
      .from("taxonomia_item")
      .select("id")
      .limit(5);
    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThan(0);
  });

  it("Diretoria inclui um item", async () => {
    const codigo = `TESTE-${Date.now()}`;
    const { data, error } = await diretor.db
      .from("taxonomia_item")
      .insert({ tipo: "segmento", codigo, rotulo: "Segmento de teste", ordem: 99 })
      .select("id")
      .single();

    expect(error).toBeNull();
    criados.push(data!.id);
  });

  it("Coordenador não inclui", async () => {
    const { error } = await coordenador.db
      .from("taxonomia_item")
      .insert({ tipo: "segmento", codigo: `NEGADO-${Date.now()}`, rotulo: "Não deveria entrar" });
    expect(error).not.toBeNull();
  });

  it("Coordenador não altera: o update não recusa, ele não atinge linha nenhuma", async () => {
    const alvo = criados[0];
    const { count } = await coordenador.db
      .from("taxonomia_item")
      .update({ rotulo: "Renomeado indevidamente" }, { count: "exact" })
      .eq("id", alvo);

    expect(count ?? 0).toBe(0);

    const { data } = await admin
      .from("taxonomia_item")
      .select("rotulo")
      .eq("id", alvo)
      .single();
    expect(data!.rotulo).toBe("Segmento de teste");
  });

  it("código repetido dentro do mesmo tipo é recusado", async () => {
    const codigo = `DUPLO-${Date.now()}`;
    const primeiro = await diretor.db
      .from("taxonomia_item")
      .insert({ tipo: "segmento", codigo, rotulo: "Primeiro" })
      .select("id")
      .single();
    criados.push(primeiro.data!.id);

    const { error } = await diretor.db
      .from("taxonomia_item")
      .insert({ tipo: "segmento", codigo, rotulo: "Segundo" });
    expect(error).not.toBeNull();
  });
});

describe("parâmetro com vigência", () => {
  it("todos leem — cálculo de qualquer tela depende disso", async () => {
    const { data, error } = await coordenador.db
      .from("parametro")
      .select("chave, valor")
      .eq("chave", "margem_minima_grande");
    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThan(0);
  });

  it("Coordenador não cria parâmetro", async () => {
    const { error } = await coordenador.db
      .from("parametro")
      .insert({ chave: "invadido", valor: 1 });
    expect(error).not.toBeNull();
  });

  it("reajuste fecha a vigência anterior em vez de sobrescrever", async () => {
    const chave = `teste_reajuste_${Date.now()}`;
    chavesCriadas.push(chave);

    const criado = await diretor.db
      .from("parametro")
      .insert({
        chave,
        valor: 0.15,
        descricao: "Criado pelo teste",
        vigencia_inicio: "2026-01-01",
      })
      .select("id")
      .single();
    expect(criado.error).toBeNull();

    const { error } = await diretor.db.rpc("reajustar_parametro", {
      p_chave: chave,
      p_valor: 0.18,
      p_inicio: "2026-07-01",
      p_descricao: null,
    });
    expect(error).toBeNull();

    const { data: linhas } = await admin
      .from("parametro")
      .select("valor, vigencia_inicio, vigencia_fim")
      .eq("chave", chave)
      .order("vigencia_inicio");

    expect(linhas).toHaveLength(2);
    // O valor antigo continua lá, com a vigência fechada na véspera.
    expect(Number(linhas![0].valor)).toBe(0.15);
    expect(linhas![0].vigencia_fim).toBe("2026-06-30");
    expect(Number(linhas![1].valor)).toBe(0.18);
    expect(linhas![1].vigencia_inicio).toBe("2026-07-01");
  });

  it("param() devolve o valor da data pedida, não o mais recente", async () => {
    const chave = `teste_param_${Date.now()}`;
    chavesCriadas.push(chave);

    await diretor.db
      .from("parametro")
      .insert({ chave, valor: 100, vigencia_inicio: "2026-01-01" });
    await diretor.db.rpc("reajustar_parametro", {
      p_chave: chave,
      p_valor: 200,
      p_inicio: "2026-07-01",
      p_descricao: null,
    });

    const antes = await admin.rpc("param", { p_chave: chave, p_data: "2026-03-15" });
    const depois = await admin.rpc("param", { p_chave: chave, p_data: "2026-09-15" });

    expect(Number(antes.data)).toBe(100);
    expect(Number(depois.data)).toBe(200);
  });

  it("vigências da mesma chave não se sobrepõem", async () => {
    const chave = `teste_sobreposicao_${Date.now()}`;
    chavesCriadas.push(chave);

    await diretor.db.from("parametro").insert({
      chave,
      valor: 1,
      vigencia_inicio: "2026-01-01",
      vigencia_fim: "2026-12-31",
    });

    const { error } = await diretor.db.from("parametro").insert({
      chave,
      valor: 2,
      vigencia_inicio: "2026-06-01",
      vigencia_fim: "2027-06-01",
    });

    expect(error).not.toBeNull();
  });

  it("reajuste não retroage — reescreveria orçamento já fechado", async () => {
    const chave = `teste_retroagir_${Date.now()}`;
    chavesCriadas.push(chave);

    await diretor.db
      .from("parametro")
      .insert({ chave, valor: 1, vigencia_inicio: "2026-06-01" });

    const { error } = await diretor.db.rpc("reajustar_parametro", {
      p_chave: chave,
      p_valor: 2,
      p_inicio: "2026-03-01",
      p_descricao: null,
    });

    expect(error).not.toBeNull();
  });

  it("Coordenador não consegue reajustar nem pela função do banco", async () => {
    const { error } = await coordenador.db.rpc("reajustar_parametro", {
      p_chave: "margem_minima_grande",
      p_valor: 0.01,
      p_inicio: "2027-01-01",
      p_descricao: null,
    });
    expect(error).not.toBeNull();
  });
});
