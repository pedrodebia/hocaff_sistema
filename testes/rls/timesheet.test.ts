import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { admin, criarAtor, removerAtor, type Ator } from "./ajuda";

/**
 * "Cada pessoa enxerga e edita apenas os próprios apontamentos" (CLAUDE.md §10).
 * Aqui isso deixa de ser texto.
 */

let alice: Ator;   // aponta horas
let bob: Ator;     // não deve ver as horas da Alice
let gerente: Ator; // GPR: vê o agregado dos projetos
let projetoComTap: string;
let projetoSemTap: string;

beforeAll(async () => {
  alice = await criarAtor([]);
  bob = await criarAtor([]);
  gerente = await criarAtor(["GPR"]);

  const { data: comTap } = await admin
    .from("projeto")
    .select("id")
    .eq("tap_assinado", true)
    .limit(1)
    .single();
  if (!comTap) throw new Error('Sem projeto com TAP. Rode "npm run seed".');
  projetoComTap = comTap.id;

  // Um projeto sem TAP, criado só para o teste da regra dura 5.
  const modelo = await admin.from("projeto").select("*").eq("id", projetoComTap).single();
  const { data: semTap, error } = await admin
    .from("projeto")
    .insert({
      ...modelo.data,
      id: undefined,
      codigo: `TESTE-SEM-TAP-${Date.now()}`,
      codigo_contrato: null,
      tap_assinado: false,
      data_tap: null,
    })
    .select("id")
    .single();
  if (error) throw new Error(`criar projeto sem TAP: ${error.message}`);
  projetoSemTap = semTap.id;
}, 120_000);

afterAll(async () => {
  await admin.from("apontamento").delete().eq("projeto_id", projetoSemTap);
  await admin.from("projeto").delete().eq("id", projetoSemTap);
  for (const a of [alice, bob, gerente]) await removerAtor(a);
}, 120_000);

describe("timesheet: cada um só o seu", () => {
  it("Alice lança a própria hora", async () => {
    const { error } = await alice.db.from("apontamento").insert({
      pessoa_id: alice.pessoaId,
      data: "2026-06-15",
      projeto_id: projetoComTap,
      horas: 8,
      etapa: "Projeto de drenagem",
    });
    expect(error).toBeNull();
  });

  it("Alice vê o próprio lançamento", async () => {
    const { data, error } = await alice.db
      .from("apontamento")
      .select("id")
      .eq("pessoa_id", alice.pessoaId);
    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThan(0);
  });

  it("Bob não vê o lançamento da Alice — nem pedindo pelo id dela", async () => {
    const { data, error } = await bob.db
      .from("apontamento")
      .select("id")
      .eq("pessoa_id", alice.pessoaId);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("Bob não consegue lançar hora no nome da Alice", async () => {
    const { error } = await bob.db.from("apontamento").insert({
      pessoa_id: alice.pessoaId,
      data: "2026-06-16",
      projeto_id: projetoComTap,
      horas: 8,
    });
    expect(error).not.toBeNull();
  });

  it("Bob não consegue apagar o lançamento da Alice", async () => {
    const { count } = await bob.db
      .from("apontamento")
      .delete({ count: "exact" })
      .eq("pessoa_id", alice.pessoaId);
    expect(count ?? 0).toBe(0);
  });

  it("Gerência de Projetos enxerga os apontamentos dos projetos", async () => {
    const { data, error } = await gerente.db
      .from("apontamento")
      .select("id")
      .eq("pessoa_id", alice.pessoaId);
    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThan(0);
  });
});

describe("regra dura 5 — sem TAP assinado, o projeto não aceita hora", () => {
  it("o banco recusa o apontamento", async () => {
    const { error } = await alice.db.from("apontamento").insert({
      pessoa_id: alice.pessoaId,
      data: "2026-06-17",
      projeto_id: projetoSemTap,
      horas: 4,
    });
    expect(error).not.toBeNull();
    expect(error!.message).toContain("TAP");
  });

  it("nem a chave de serviço passa por cima: a regra é trigger, não policy", async () => {
    const { error } = await admin.from("apontamento").insert({
      pessoa_id: alice.pessoaId,
      data: "2026-06-18",
      projeto_id: projetoSemTap,
      horas: 4,
    });
    expect(error).not.toBeNull();
  });
});

describe("apontamento é projeto OU atividade fora de projeto, nunca os dois", () => {
  it("recusa lançamento sem destino", async () => {
    const { error } = await alice.db.from("apontamento").insert({
      pessoa_id: alice.pessoaId,
      data: "2026-06-19",
      horas: 4,
    });
    expect(error).not.toBeNull();
  });

  it("recusa lançamento com os dois destinos", async () => {
    const { data: atividade } = await admin
      .from("taxonomia_item")
      .select("id")
      .eq("tipo", "atividade_nao_projeto")
      .limit(1)
      .single();

    const { error } = await alice.db.from("apontamento").insert({
      pessoa_id: alice.pessoaId,
      data: "2026-06-20",
      projeto_id: projetoComTap,
      atividade_id: atividade!.id,
      horas: 4,
    });
    expect(error).not.toBeNull();
  });

  it("aceita atividade fora de projeto — a categoria é obrigatória no modelo", async () => {
    const { data: atividade } = await admin
      .from("taxonomia_item")
      .select("id")
      .eq("tipo", "atividade_nao_projeto")
      .limit(1)
      .single();

    const { error } = await alice.db.from("apontamento").insert({
      pessoa_id: alice.pessoaId,
      data: "2026-06-21",
      atividade_id: atividade!.id,
      horas: 8,
    });
    expect(error).toBeNull();
  });
});
