import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * O `next dev` anexa um bloco de instruções para agentes de IA ao CLAUDE.md
   * toda vez que sobe. Aqui o CLAUDE.md é o documento de domínio do projeto —
   * papéis, modelo de confidencialidade, regras inegociáveis — e não o lugar de
   * aviso de framework. Desligado para o arquivo continuar sendo só isso.
   *
   * Se precisar do aviso do Next 16 para agentes, ligue de volta: o bloco vem
   * marcado com <!-- BEGIN:nextjs-agent-rules -->.
   */
  agentRules: false,
};

export default nextConfig;
