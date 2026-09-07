-- =====================================================================
--  0002 — Taxonomias completas
--
--  Carrega em taxonomia_item todas as listas do CAD_PARAMETROS.xlsx
--  (entregável E0) e as que ficaram implícitas nas bases de portfólio
--  e de planejamento financeiro.
--
--  A migração 0001 já semeou 'grupo', 'funcao', 'cargo' e
--  'atividade_nao_projeto'. Aqui vem o resto.
--
--  Idempotente: on conflict (tipo, codigo) do nothing. Rodar de novo não
--  duplica e não sobrescreve rótulo já ajustado pela Diretoria na tela.
-- =====================================================================

insert into taxonomia_item (tipo, codigo, rotulo, ordem) values
  -- SEGMENTO
  ('segmento','SEG-01','Loteamento / Incorporação',1),
  ('segmento','SEG-02','Indústria',2),
  ('segmento','SEG-03','Óleo & Gás / Energia',3),
  ('segmento','SEG-04','Agronegócio',4),
  ('segmento','SEG-05','Varejo / Comercial',5),
  ('segmento','SEG-06','Saúde / Educação',6),
  ('segmento','SEG-07','Construtora / Empreiteira',7),
  ('segmento','SEG-08','Poder Público',8),
  ('segmento','SEG-09','Concessionária',9),
  ('segmento','SEG-99','Outros',10),

  -- ESPECIALIDADE
  ('especialidade','ESP-01','Infraestrutura Urbana',1),
  ('especialidade','ESP-02','Saneamento',2),
  ('especialidade','ESP-03','Projetos Prediais',3),
  ('especialidade','ESP-04','Estrutural',4),
  ('especialidade','ESP-05','Elétrica / Instalações',5),
  ('especialidade','ESP-06','Geotecnia',6),
  ('especialidade','ESP-07','Licenciamento / Ambiental',7),
  ('especialidade','ESP-08','Consultoria / Gerenciamento',8),
  ('especialidade','ESP-09','Laudos e Perícias',9),
  ('especialidade','ESP-99','Outros',10),

  -- NATUREZA DO CLIENTE
  ('natureza_cliente','NAT-01','Público',1),
  ('natureza_cliente','NAT-02','Privado',2),
  ('natureza_cliente','NAT-03','Economia Mista',3),

  -- PAPEL DA HOCAFF NO CONTRATO
  ('papel_hocaff','PAP-01','Tomador Final',1),
  ('papel_hocaff','PAP-02','Subcontratada',2),
  ('papel_hocaff','PAP-03','Consórcio / Parceria',3),

  -- ORIGEM DA CAPTAÇÃO
  ('origem_captacao','ORI-01','Prospecção ativa',1),
  ('origem_captacao','ORI-02','Indicação de cliente',2),
  ('origem_captacao','ORI-03','Indicação de parceiro',3),
  ('origem_captacao','ORI-04','Portal de licitação / Edital',4),
  ('origem_captacao','ORI-05','Convite recorrente',5),
  ('origem_captacao','ORI-06','Site / Inbound',6),
  ('origem_captacao','ORI-07','Evento / Relacionamento',7),
  ('origem_captacao','ORI-99','Outros',8),

  -- TIPO DE SOLICITAÇÃO
  ('tipo_solicitacao','TIP-01','Edital Público',1),
  ('tipo_solicitacao','TIP-02','Carta-Convite Privada',2),
  ('tipo_solicitacao','TIP-03','Cotação / RFQ',3),
  ('tipo_solicitacao','TIP-04','Demanda espontânea',4),
  ('tipo_solicitacao','TIP-05','Aditivo de contrato vigente',5),

  -- REGIME DE PREÇO
  ('regime_preco','REG-01','Preço Global',1),
  ('regime_preco','REG-02','Preço Unitário',2),
  ('regime_preco','REG-03','Misto',3),

  -- CRITÉRIO DE MEDIÇÃO
  ('criterio_medicao','MED-01','Por marco / entrega',1),
  ('criterio_medicao','MED-02','Por percentual de avanço',2),
  ('criterio_medicao','MED-03','Por quantidade executada',3),
  ('criterio_medicao','MED-04','Misto',4),

  -- BASE DE PAGAMENTO
  ('base_pagamento','PAG-01','Após medição e emissão de NF (padrão Hocaff)',1),
  ('base_pagamento','PAG-02','Após aprovação da medição pelo cliente',2),
  ('base_pagamento','PAG-03','Por marco de entrega',3),
  ('base_pagamento','PAG-04','Sinal + parcelas',4),
  ('base_pagamento','PAG-05','Antecipado',5),
  ('base_pagamento','PAG-99','Outro',6),

  -- MOTIVO DE PERDA
  ('motivo_perda','PER-01','Preço acima',1),
  ('motivo_perda','PER-02','Prazo inviável',2),
  ('motivo_perda','PER-03','Requisito técnico / habilitação',3),
  ('motivo_perda','PER-04','Relacionamento do concorrente',4),
  ('motivo_perda','PER-05','Cliente desistiu ou adiou',5),
  ('motivo_perda','PER-06','Fora do nosso core',6),
  ('motivo_perda','PER-07','Sem resposta',7),
  ('motivo_perda','PER-99','Outros',8),

  -- MOTIVO DE REVISÃO
  ('motivo_revisao','REV-00','Proposta original',1),
  ('motivo_revisao','REV-01','Alteração de escopo pelo cliente',2),
  ('motivo_revisao','REV-02','Ajuste comercial na negociação',3),
  ('motivo_revisao','REV-03','Correção interna',4),
  ('motivo_revisao','REV-04','Prorrogação de prazo',5),
  ('motivo_revisao','REV-05','Reapresentação por exigência do edital',6),
  ('motivo_revisao','REV-99','Outros',7),

  -- MACRORREGIÃO
  ('macrorregiao','MAC-01','Bauru e região',1),
  ('macrorregiao','MAC-02','Interior SP',2),
  ('macrorregiao','MAC-03','Grande SP',3),
  ('macrorregiao','MAC-04','Outros estados',4),

  -- MODALIDADE DE EXECUÇÃO
  ('modalidade_execucao','MOD-01','100% equipe própria',1),
  ('modalidade_execucao','MOD-02','Misto',2),
  ('modalidade_execucao','MOD-03','100% terceirizado',3),

  -- UNIDADE
  ('unidade','UN-01','vb',1),
  ('unidade','UN-02','un',2),
  ('unidade','UN-03','m',3),
  ('unidade','UN-04','m²',4),
  ('unidade','UN-05','m³',5),
  ('unidade','UN-06','km',6),
  ('unidade','UN-07','h',7),
  ('unidade','UN-08','mês',8),

  -- TIPO DE DESPESA DIRETA DE PROJETO
  ('tipo_despesa','DES-01','Viagem',1),
  ('tipo_despesa','DES-02','Hospedagem',2),
  ('tipo_despesa','DES-03','Plotagem / reprografia',3),
  ('tipo_despesa','DES-04','ART / RRT',4),
  ('tipo_despesa','DES-05','Sondagem',5),
  ('tipo_despesa','DES-06','Ensaios',6),
  ('tipo_despesa','DES-07','Taxas e emolumentos',7),
  ('tipo_despesa','DES-99','Outros',8),

  -- STATUS DO PROJETO  (implícito na BASE_PORTFOLIO)
  ('status_projeto','STP-01','Em mobilização',1),
  ('status_projeto','STP-02','Em execução',2),
  ('status_projeto','STP-03','Suspenso',3),
  ('status_projeto','STP-04','Concluído',4),
  ('status_projeto','STP-05','Cancelado',5),

  -- PAPEL NA EQUIPE DO PROJETO  (aba EQUIPE da BASE_PORTFOLIO)
  ('papel_equipe','PEQ-01','Coordenador de Projetos',1),
  ('papel_equipe','PEQ-02','Líder Técnico',2),
  ('papel_equipe','PEQ-03','Equipe técnica',3),
  ('papel_equipe','PEQ-04','Apoio',4),

  -- STATUS DA MEDIÇÃO  (aba PARAM da BASE_CUSTOS_MEDICOES)
  ('status_medicao','STM-01','Em elaboração',1),
  ('status_medicao','STM-02','Enviada ao cliente',2),
  ('status_medicao','STM-03','Aprovada',3),
  ('status_medicao','STM-04','Glosada parcialmente',4),
  ('status_medicao','STM-05','Rejeitada',5),

  -- STATUS DO MARCO  (aba MARCOS da BASE_PORTFOLIO)
  ('status_marco','STC-01','Previsto',1),
  ('status_marco','STC-02','Em andamento',2),
  ('status_marco','STC-03','Concluído',3),
  ('status_marco','STC-04','Atrasado',4),
  ('status_marco','STC-05','Cancelado',5),

  -- PERIODICIDADE DE REUNIÃO
  ('periodicidade','PRD-01','Semanal',1),
  ('periodicidade','PRD-02','Quinzenal',2),
  ('periodicidade','PRD-03','Mensal',3),
  ('periodicidade','PRD-04','Sob demanda',4),

  -- ESCALA  (probabilidade e impacto de risco)
  ('escala','ESC-01','Baixa',1),
  ('escala','ESC-02','Média',2),
  ('escala','ESC-03','Alta',3),

  -- RUBRICA DE RECEITA  (aba PARAM do PLAN_FINANCEIRO)
  ('rubrica_receita','RRE-01','Medição contratada',1),
  ('rubrica_receita','RRE-02','Devolução de caução ou retenção',2),
  ('rubrica_receita','RRE-99','Outras receitas',3),

  -- RUBRICA DE DESPESA  (aba PARAM do PLAN_FINANCEIRO)
  ('rubrica_despesa','RDE-01','Folha e encargos',1),
  ('rubrica_despesa','RDE-02','Serviços de terceiros',2),
  ('rubrica_despesa','RDE-03','Despesas diretas de projeto',3),
  ('rubrica_despesa','RDE-04','Despesas administrativas',4),
  ('rubrica_despesa','RDE-05','Tributos sobre faturamento',5),
  ('rubrica_despesa','RDE-06','Tributos sobre o lucro',6),
  ('rubrica_despesa','RDE-07','Investimentos',7),
  ('rubrica_despesa','RDE-99','Outras despesas',8)

on conflict (tipo, codigo) do nothing;
