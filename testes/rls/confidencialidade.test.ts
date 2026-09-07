import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  criarAtor, removerAtor, contar, contarComoAdmin, podeVerRestrito,
  TODOS_OS_PAPEIS, RELACOES_RESTRITAS, RELACOES_ABERTAS, type Ator,
} from "./ajuda";
import type { PapelSistema } from "../../supabase/seed/dados";

/**
 * O requisito central do CLAUDE.md, verificado papel a papel.
 *
 * A pergunta não é "a tela esconde?" e sim "o banco devolve?". Cada caso
 * abaixo loga de verdade como o papel e conta linhas.
 */

const atores = new Map<string, Ator>();
const CASOS: { nome: string; papeis: PapelSistema[] }[] = [
  ...TODOS_OS_PAPEIS.map((p) => ({ nome: p, papeis: [p] })),
  { nome: "sem papel", papeis: [] },
  { nome: "CPR+LT (acumula dois)", papeis: ["CPR", "LT"] },
];

beforeAll(async () => {
  for (const caso of CASOS) atores.set(caso.nome, await criarAtor(caso.papeis));
}, 120_000);

afterAll(async () => {
  for (const ator of atores.values()) await removerAtor(ator);
}, 120_000);

describe("o lado restrito só existe para GCM, DE e DT", () => {
  for (const relacao of RELACOES_RESTRITAS) {
    describe(relacao, () => {
      it("tem dado a proteger — senão o teste não prova nada", async () => {
        expect(
          await contarComoAdmin(relacao),
          `${relacao} está vazia. Rode "npm run seed" antes: zero linha por ` +
            `tabela vazia não distingue policy boa de policy ausente.`,
        ).toBeGreaterThan(0);
      });

      for (const caso of CASOS) {
        const deveLer = podeVerRestrito(caso.papeis);

        it(`${caso.nome} ${deveLer ? "lê" : "recebe zero linha"}`, async () => {
          const ator = atores.get(caso.nome)!;
          const { linhas } = await contar(ator.db, relacao);

          if (deveLer) {
            expect(linhas).toBeGreaterThan(0);
          } else {
            expect(
              linhas,
              `${caso.nome} leu ${linhas} linha(s) de ${relacao}. ` +
                `O modelo de confidencialidade está furado.`,
            ).toBe(0);
          }
        });
      }
    });
  }
});

describe("o lado aberto é aberto para todo mundo que está autenticado", () => {
  for (const relacao of RELACOES_ABERTAS) {
    it(`${relacao}: até quem não tem papel algum lê`, async () => {
      const ator = atores.get("sem papel")!;
      const total = await contarComoAdmin(relacao);
      const { linhas, erro } = await contar(ator.db, relacao);

      expect(erro).toBeNull();
      expect(linhas).toBe(total);
    });
  }

  it("valor do contrato é aberto — é público por lei ou conhecido do cliente", async () => {
    const ator = atores.get("CPR")!;
    const { data, error } = await ator.db
      .from("projeto")
      .select("codigo, valor_contrato")
      .eq("codigo", "I-0245")
      .maybeSingle();

    expect(error).toBeNull();
    expect(Number(data?.valor_contrato)).toBe(257280);
  });

  it("preço sugerido e preço mínimo voltam do orçamento para quem negocia", async () => {
    const ator = atores.get("CNN")!;
    const { data, error } = await ator.db
      .from("revisao")
      .select("preco_sugerido, preco_minimo, valor_proposto")
      .eq("status", "vigente")
      .limit(1)
      .single();

    expect(error).toBeNull();
    expect(Number(data!.preco_sugerido)).toBeGreaterThan(0);
    expect(Number(data!.preco_minimo)).toBeGreaterThan(0);
  });

  it("nenhuma coluna sensível vazou para dentro de uma tabela aberta", async () => {
    const ator = atores.get("CNN")!;
    const { data } = await ator.db.from("projeto").select("*").limit(1).single();

    const proibidas = ["custo", "margem", "bdi", "custo_hora", "valor_hora"];
    const encontradas = Object.keys(data ?? {}).filter((c) =>
      proibidas.some((p) => c.includes(p)),
    );

    expect(
      encontradas,
      `A tabela aberta "projeto" ganhou coluna sensível: ${encontradas.join(", ")}. ` +
        `Dado sensível vive em tabela restrita — RLS é por linha, não por coluna.`,
    ).toEqual([]);
  });
});

describe("a view de custo não é porta dos fundos", () => {
  it("CPR não lê v_custo_realizado, mesmo lendo os apontamentos dos seus projetos", async () => {
    const ator = atores.get("CPR")!;
    const { linhas } = await contar(ator.db, "v_custo_realizado");
    expect(
      linhas,
      "View sem security_invoker roda com os privilégios do dono e passa por " +
        "cima da RLS. Ver migração 0003.",
    ).toBe(0);
  });

  it("GCM lê v_custo_realizado", async () => {
    const ator = atores.get("GCM")!;
    const { linhas } = await contar(ator.db, "v_custo_realizado");
    expect(linhas).toBeGreaterThan(0);
  });

  it("v_hh_realizado respeita a RLS de apontamento", async () => {
    const semPapel = atores.get("sem papel")!;
    const gcm = atores.get("GCM")!;

    const { linhas: doSemPapel } = await contar(semPapel.db, "v_hh_realizado");
    const { linhas: doGcm } = await contar(gcm.db, "v_hh_realizado");

    expect(doSemPapel).toBe(0);
    expect(doGcm).toBeGreaterThan(0);
  });
});
