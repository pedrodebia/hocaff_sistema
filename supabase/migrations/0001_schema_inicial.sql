-- =====================================================================
--  HOCAFF — Sistema de Gestão de Novos Negócios e Projetos
--  Schema PostgreSQL / Supabase — v0
--
--  Ordem: extensões · papéis e helpers · taxonomias e parâmetros ·
--         cadastros · funil · projetos · timesheet · custos (restrito) ·
--         financeiro (restrito) · RLS · seeds
--
--  REGRA: dado sensível (custo, margem, faturamento) vive em tabela
--  separada com policy restritiva. Tabela aberta não tem coluna sensível.
-- =====================================================================

create extension if not exists "pgcrypto";
create extension if not exists btree_gist;

-- =====================================================================
--  1. PAPÉIS E HELPERS
-- =====================================================================

create type papel as enum ('CNN','DT','DE','GPR','CPR','LT','GCM','ADM');

create table pessoa (
  id            uuid primary key default gen_random_uuid(),
  matricula     text unique not null,
  nome          text not null,
  email         text unique,
  auth_user_id  uuid unique references auth.users(id) on delete set null,
  cargo_id      uuid not null,           -- FK adiada: taxonomia_item
  nivel         smallint not null check (nivel between 1 and 3),
  tipo_vinculo  text not null check (tipo_vinculo in ('Própria','Terceirizada')),
  especialidade_id uuid,                 -- taxonomia_item
  admissao      date,
  saida         date,
  jornada_mensal numeric(6,2) not null default 176,
  aproveitamento numeric(7,6) not null default 0.75
                 check (aproveitamento between 0 and 1),
  ativo         boolean not null default true,
  criado_em     timestamptz not null default now(),
  alterado_em   timestamptz not null default now()
);
comment on column pessoa.aproveitamento is
  'Fração da jornada apropriável a projeto. Direção fica bem abaixo de coordenação.';
comment on table pessoa is
  'NÃO contém salário nem custo. Custo vive em custo_recurso, por função e nível.';

create table pessoa_papel (
  pessoa_id uuid not null references pessoa(id) on delete cascade,
  papel     papel not null,
  primary key (pessoa_id, papel)
);

-- Papéis do usuário autenticado. STABLE para o planner cachear por statement.
create or replace function meus_papeis() returns papel[]
language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(pp.papel), '{}')
  from pessoa p join pessoa_papel pp on pp.pessoa_id = p.id
  where p.auth_user_id = auth.uid() and p.ativo
$$;

create or replace function tem_papel(variadic ps papel[]) returns boolean
language sql stable as $$ select meus_papeis() && ps $$;

-- Quem enxerga custo, margem e financeiro.
create or replace function pode_ver_restrito() returns boolean
language sql stable as $$ select tem_papel('GCM','DE','DT') $$;

create or replace function minha_pessoa_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from pessoa where auth_user_id = auth.uid() and ativo limit 1
$$;

-- =====================================================================
--  2. TAXONOMIAS E PARÂMETROS  (tudo dado, nada enum de código)
-- =====================================================================

create type taxonomia_tipo as enum (
  'grupo','funcao','cargo','segmento','especialidade','natureza_cliente',
  'papel_hocaff','origem_captacao','tipo_solicitacao','regime_preco',
  'criterio_medicao','base_pagamento','motivo_perda','motivo_revisao',
  'macrorregiao','modalidade_execucao','status_projeto','papel_equipe',
  'escala','status_medicao','status_marco','periodicidade','unidade',
  'tipo_despesa','atividade_nao_projeto','rubrica_receita','rubrica_despesa'
);

create table taxonomia_item (
  id      uuid primary key default gen_random_uuid(),
  tipo    taxonomia_tipo not null,
  codigo  text not null,
  rotulo  text not null,
  ordem   smallint not null default 0,
  ativo   boolean not null default true,
  extra   jsonb not null default '{}',   -- ex.: {"funcao_id": "..."} no cargo
  unique (tipo, codigo)
);
comment on table taxonomia_item is
  'Fonte única de todas as listas. Desativar em vez de excluir: registros '
  'históricos apontam para o item.';

-- Garante que uma FK aponte para um item do tipo certo.
create or replace function eh_taxonomia(p_id uuid, p_tipo taxonomia_tipo)
returns boolean language sql stable as $$
  select exists (select 1 from taxonomia_item where id = p_id and tipo = p_tipo)
$$;

alter table pessoa
  add constraint pessoa_cargo_fk foreign key (cargo_id) references taxonomia_item(id),
  add constraint pessoa_esp_fk foreign key (especialidade_id) references taxonomia_item(id);

-- CHECK não aceita função que consulta tabela; a validação de tipo vai em trigger.
create or replace function valida_tipo_taxonomia() returns trigger
language plpgsql as $$
declare
  col text; tipo_esperado text; v uuid;
begin
  foreach col in array tg_argv[0]::text[] loop
    execute format('select ($1).%I', col) into v using new;
    tipo_esperado := tg_argv[1];
    if v is not null and not eh_taxonomia(v, tipo_esperado::taxonomia_tipo) then
      raise exception '%.% deve apontar para taxonomia do tipo %',
        tg_table_name, col, tipo_esperado;
    end if;
  end loop;
  return new;
end $$;

create trigger pessoa_cargo_tipo before insert or update on pessoa
  for each row execute function valida_tipo_taxonomia('{cargo_id}', 'cargo');

-- Parâmetros de política, com vigência.
create table parametro (
  id              uuid primary key default gen_random_uuid(),
  chave           text not null,
  valor           numeric(14,6) not null,
  descricao       text,
  vigencia_inicio date not null default current_date,
  vigencia_fim    date not null default '2099-12-31',
  criado_em       timestamptz not null default now()
);
create index on parametro (chave, vigencia_inicio, vigencia_fim);

create or replace function param(p_chave text, p_data date default current_date)
returns numeric language sql stable as $$
  select valor from parametro
  where chave = p_chave and p_data between vigencia_inicio and vigencia_fim
  order by vigencia_inicio desc limit 1
$$;

-- =====================================================================
--  3. CADASTROS
-- =====================================================================

create table cliente (
  id             uuid primary key default gen_random_uuid(),
  codigo         text unique not null,
  nome           text not null,
  cnpj           text,
  natureza_id    uuid references taxonomia_item(id),
  segmento_id    uuid references taxonomia_item(id),
  grupo_pai_id   uuid references cliente(id),
  ativo          boolean not null default true,
  criado_em      timestamptz not null default now()
);

-- =====================================================================
--  4. FUNIL  (aberto, exceto revisao_economico)
-- =====================================================================

create table oportunidade (
  id                uuid primary key default gen_random_uuid(),
  codigo            text unique not null,            -- OP-I-0312
  grupo_id          uuid not null references taxonomia_item(id),
  data_entrada      date not null default current_date,
  registrado_por    uuid not null references pessoa(id),
  cliente_id        uuid not null references cliente(id),
  papel_hocaff_id   uuid references taxonomia_item(id),
  contato_cliente   text,
  origem_id         uuid not null references taxonomia_item(id),
  captado_por       uuid references pessoa(id),
  objeto            text not null,
  tipo_solicitacao_id uuid not null references taxonomia_item(id),
  especialidade_id  uuid references taxonomia_item(id),
  municipio         text,
  uf                char(2),
  macrorregiao_id   uuid references taxonomia_item(id),
  projeto_origem_id uuid,                            -- se aditivo
  prazo_proposta    date,
  prazo_execucao_meses smallint,

  -- Portão 1
  data_qualificacao date,
  decisao           text check (decisao in ('Go','No-Go')),
  qualificado_por_1 uuid references pessoa(id),
  qualificado_por_2 uuid references pessoa(id),
  crit_fit_tecnico       text check (crit_fit_tecnico in ('Sim','Não','NA')),
  crit_capacidade_hh     text check (crit_capacidade_hh in ('Sim','Não','NA')),
  crit_habilitacao       text check (crit_habilitacao in ('Sim','Não','NA')),
  crit_prazo_exequivel   text check (crit_prazo_exequivel in ('Sim','Não','NA')),
  crit_risco_cliente     text check (crit_risco_cliente in ('Sim','Não','NA')),
  crit_valor_estrategico text check (crit_valor_estrategico in ('Sim','Não','NA')),
  motivo_nogo       text,

  estagio           smallint not null default 0 check (estagio between 0 and 8),
  data_estagio      date not null default current_date,
  data_desfecho     date,
  motivo_perda_id   uuid references taxonomia_item(id),
  valor_estimado_inicial numeric(14,2),   -- pondera o topo do funil

  criado_em    timestamptz not null default now(),
  criado_por   uuid references pessoa(id),
  alterado_em  timestamptz not null default now(),
  alterado_por uuid references pessoa(id),

  -- Regra dura 2: duas pessoas, e pessoas diferentes
  constraint qualificacao_duas_pessoas check (
    estagio < 1 or (qualificado_por_1 is not null
                    and qualificado_por_2 is not null
                    and qualificado_por_1 <> qualificado_por_2)),
  -- Regra dura 3
  constraint perda_exige_motivo check (estagio <> 6 or motivo_perda_id is not null),
  constraint nogo_exige_motivo  check (estagio <> 8 or motivo_nogo is not null)
);
create index on oportunidade (estagio);
create index on oportunidade (cliente_id);
create index on oportunidade (data_entrada);

create type status_revisao as enum ('rascunho','enviada','vigente','substituida');

create table revisao (
  id                uuid primary key default gen_random_uuid(),
  oportunidade_id   uuid not null references oportunidade(id) on delete cascade,
  numero            smallint not null,
  data_emissao      date not null,
  motivo_id         uuid references taxonomia_item(id),
  o_que_mudou       text,
  regime_preco_id   uuid references taxonomia_item(id),
  criterio_medicao_id uuid references taxonomia_item(id),
  prazo_execucao_meses smallint,
  validade          date,
  modalidade_id     uuid references taxonomia_item(id),

  custo_terceiros   numeric(14,2) default 0,   -- externo: aberto
  despesas_diretas  numeric(14,2) default 0,   -- externo: aberto
  ha_faturamento_direto boolean not null default false,
  valor_faturamento_direto numeric(14,2) default 0,

  base_pagamento_id uuid references taxonomia_item(id),
  prazo_pagamento_dias smallint,
  exige_caucao      boolean not null default false,
  pct_caucao        numeric(7,6) default 0,
  prazo_devolucao_dias smallint,
  texto_condicao    text,

  preco_sugerido    numeric(14,2),   -- devolvido pelo GCM
  preco_minimo      numeric(14,2),   -- devolvido pelo GCM
  valor_proposto    numeric(14,2),

  status            status_revisao not null default 'rascunho',
  link_proposta     text,
  link_orcamento    text,            -- arquivo Excel restrito no SharePoint
  aprovado_por      uuid references pessoa(id),
  data_aprovacao    date,
  justificativa_abaixo_minima text,  -- regra dura 4 na instância máxima

  criado_em    timestamptz not null default now(),
  alterado_em  timestamptz not null default now(),
  unique (oportunidade_id, numero)
);

-- Regra dura 10: só uma revisão vigente por oportunidade
create unique index revisao_uma_vigente
  on revisao (oportunidade_id) where status = 'vigente';

create table revisao_hh (
  id           uuid primary key default gen_random_uuid(),
  revisao_id   uuid not null references revisao(id) on delete cascade,
  etapa        text,
  cargo_id     uuid not null references taxonomia_item(id),
  nivel        smallint not null check (nivel between 1 and 3),
  hh           numeric(10,2) not null check (hh >= 0),
  origem       text not null check (origem in ('Própria','Terceirizada'))
);
create index on revisao_hh (revisao_id);

-- ---------- RESTRITO ----------
create table revisao_economico (
  revisao_id        uuid primary key references revisao(id) on delete cascade,
  custo_hh_proprio  numeric(14,2) not null default 0,
  custo_total       numeric(14,2) not null default 0,
  custo_faturamento_direto numeric(14,2) not null default 0,
  bdi_cheio         numeric(7,6),
  bdi_reduzido      numeric(7,6),
  margem_valor      numeric(14,2),
  margem_pct        numeric(7,6),
  alcada            text,
  aprovado_por      uuid references pessoa(id),
  alterado_em       timestamptz not null default now()
);
comment on table revisao_economico is 'RESTRITO — GCM, DE, DT.';

-- =====================================================================
--  5. PROJETOS  (aberto)
-- =====================================================================

create table projeto (
  id                uuid primary key default gen_random_uuid(),
  codigo            text unique not null,            -- I-0245
  codigo_contrato   text,                            -- I-0245-01
  oportunidade_id   uuid references oportunidade(id),
  revisao_id        uuid references revisao(id),
  grupo_id          uuid not null references taxonomia_item(id),
  cliente_id        uuid not null references cliente(id),
  objeto            text not null,
  especialidade_id  uuid references taxonomia_item(id),
  municipio         text,
  uf                char(2),

  -- linha de base CONGELADA na assinatura do TAP
  escopo_resumido   text,
  entregas          text,
  exclusoes         text,
  premissas         text,

  data_assinatura   date,
  data_inicio       date,
  prazo_meses       smallint,
  data_termino_real date,
  valor_contrato    numeric(14,2),                   -- aberto
  regime_preco_id   uuid references taxonomia_item(id),
  criterio_medicao_id uuid references taxonomia_item(id),
  base_pagamento_id uuid references taxonomia_item(id),
  prazo_pagamento_dias smallint,
  exige_caucao      boolean not null default false,
  pct_caucao        numeric(7,6) default 0,

  coordenador_id    uuid references pessoa(id),
  gerencia_id       uuid references pessoa(id),
  interface_cliente text,
  periodicidade_id  uuid references taxonomia_item(id),

  tap_assinado      boolean not null default false,
  data_tap          date,
  status_id         uuid references taxonomia_item(id),

  criado_em    timestamptz not null default now(),
  alterado_em  timestamptz not null default now()
);
comment on column projeto.premissas is
  'Premissa registrada sustenta pleito de aditivo. Não registrada vira prejuízo absorvido.';

create table projeto_hh_baseline (
  id         uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references projeto(id) on delete cascade,
  etapa      text,
  cargo_id   uuid not null references taxonomia_item(id),
  nivel      smallint not null check (nivel between 1 and 3),
  hh         numeric(10,2) not null,
  origem     text not null check (origem in ('Própria','Terceirizada'))
);
comment on table projeto_hh_baseline is
  'Cópia do orçamento aprovado, congelada no TAP. Escopo novo é aditivo com nova baseline.';

create table projeto_equipe (
  id             uuid primary key default gen_random_uuid(),
  projeto_id     uuid not null references projeto(id) on delete cascade,
  pessoa_id      uuid not null references pessoa(id),
  papel_id       uuid references taxonomia_item(id),
  especialidade_id uuid references taxonomia_item(id),
  data_entrada   date,
  data_saida     date
);
create index on projeto_equipe (projeto_id);
create index on projeto_equipe (pessoa_id);

create table projeto_marco (
  id             uuid primary key default gen_random_uuid(),
  projeto_id     uuid not null references projeto(id) on delete cascade,
  numero         smallint not null,
  descricao      text not null,
  data_prevista  date,
  data_real      date,
  status_id      uuid references taxonomia_item(id),
  unique (projeto_id, numero)
);

create table projeto_risco (
  id             uuid primary key default gen_random_uuid(),
  projeto_id     uuid not null references projeto(id) on delete cascade,
  numero         smallint not null,
  descricao      text not null,
  probabilidade  text check (probabilidade in ('Baixa','Média','Alta')),
  impacto        text check (impacto in ('Baixa','Média','Alta')),
  acao           text,
  responsavel_id uuid references pessoa(id),
  situacao       text not null default 'Aberto',
  unique (projeto_id, numero)
);

create table medicao_fisica (
  id             uuid primary key default gen_random_uuid(),
  projeto_id     uuid not null references projeto(id) on delete cascade,
  numero         smallint not null,
  periodo        date not null,                     -- 1º dia do mês
  data_apuracao  date,
  pct_acumulado  numeric(7,6) not null check (pct_acumulado between 0 and 1),
  descricao      text,
  atestada_por   uuid references pessoa(id),
  data_atesto    date,
  status_id      uuid references taxonomia_item(id),
  enviada_gcm_em date,
  unique (projeto_id, numero)
);
comment on table medicao_fisica is
  'O Coordenador atesta o executado. Nenhum valor em reais aqui.';

-- =====================================================================
--  6. TIMESHEET  (aberto, mas cada um só vê o próprio)
-- =====================================================================

create table apontamento (
  id              uuid primary key default gen_random_uuid(),
  pessoa_id       uuid not null references pessoa(id),
  data            date not null,
  projeto_id      uuid references projeto(id),
  atividade_id    uuid references taxonomia_item(id),   -- atividade_nao_projeto
  etapa           text,
  horas           numeric(5,2) not null check (horas > 0 and horas <= 24),
  criado_em       timestamptz not null default now(),
  alterado_em     timestamptz not null default now(),
  -- ou é projeto, ou é atividade fora de projeto; nunca os dois nem nenhum
  constraint apontamento_destino check (
    (projeto_id is not null and atividade_id is null) or
    (projeto_id is null and atividade_id is not null))
);
create index on apontamento (pessoa_id, data);
create index on apontamento (projeto_id, data);

-- Regra dura 5: sem TAP, não aceita hora
create or replace function checa_tap() returns trigger
language plpgsql as $$
begin
  if new.projeto_id is not null
     and not exists (select 1 from projeto
                     where id = new.projeto_id and tap_assinado) then
    raise exception 'Projeto sem TAP assinado não aceita apontamento de horas';
  end if;
  return new;
end $$;
create trigger apontamento_tap before insert or update on apontamento
  for each row execute function checa_tap();

-- =====================================================================
--  7. CUSTOS E MEDIÇÕES  (RESTRITO)
-- =====================================================================

create table custo_recurso (
  id              uuid primary key default gen_random_uuid(),
  funcao_id       uuid not null references taxonomia_item(id),
  nivel           smallint not null check (nivel between 1 and 3),
  valor_hora      numeric(10,2) not null,
  vigencia_inicio date not null,
  vigencia_fim    date not null default '2099-12-31',
  exclude using gist (
    funcao_id with =, nivel with =,
    daterange(vigencia_inicio, vigencia_fim, '[]') with &&
  )
);
comment on table custo_recurso is
  'RESTRITO. Reajuste fecha a vigência atual e abre linhas novas. '
  'Nunca altere um valor já usado: reescreveria a história.';

create table tributo (
  id              uuid primary key default gen_random_uuid(),
  nome            text not null,
  aliquota        numeric(7,6) not null,
  base            text not null check (base in ('Faturamento','Lucro')),
  vigencia_inicio date not null,
  vigencia_fim    date not null default '2099-12-31'
);

create or replace function carga_tributaria(p_base text, p_data date default current_date)
returns numeric language sql stable as $$
  select coalesce(sum(aliquota),0) from tributo
  where (p_base is null or base = p_base)
    and p_data between vigencia_inicio and vigencia_fim
$$;

create table medicao_financeira (
  id                uuid primary key default gen_random_uuid(),
  medicao_fisica_id uuid unique not null references medicao_fisica(id),
  projeto_id        uuid not null references projeto(id),
  pct_periodo       numeric(7,6),
  valor_bruto       numeric(14,2),
  glosa             numeric(14,2) default 0,
  valor_aprovado    numeric(14,2),
  data_aprovacao    date
);

create table faturamento (
  id                uuid primary key default gen_random_uuid(),
  medicao_financeira_id uuid references medicao_financeira(id),
  projeto_id        uuid not null references projeto(id),
  nota_fiscal       text,
  data_emissao      date,
  valor_nf          numeric(14,2),
  pct_retencao      numeric(7,6) default 0,
  prazo_dias        smallint,
  data_recebimento  date,
  valor_recebido    numeric(14,2)
);

create table projeto_economico (
  projeto_id            uuid primary key references projeto(id) on delete cascade,
  valor_faturamento_direto numeric(14,2) default 0,
  custo_orcado_hh       numeric(14,2) default 0,
  custo_orcado_terceiros numeric(14,2) default 0,
  custo_orcado_despesas numeric(14,2) default 0,
  custo_faturamento_direto numeric(14,2) default 0,
  alterado_em           timestamptz not null default now()
);

-- =====================================================================
--  8. FINANCEIRO  (RESTRITO)
-- =====================================================================

create table receita_evento (
  id            uuid primary key default gen_random_uuid(),
  projeto_id    uuid references projeto(id),
  oportunidade_id uuid references oportunidade(id),   -- funil provável
  descricao     text,
  rubrica_id    uuid references taxonomia_item(id),
  origem        text not null check (origem in ('Contratada','Provável','Caução')),
  mes_competencia date not null,
  valor         numeric(14,2) not null,
  probabilidade numeric(7,6) default 1,
  prazo_dias    smallint not null default 30,
  situacao      text not null default 'Prevista',
  criado_em     timestamptz not null default now()
);

create table despesa_evento (
  id            uuid primary key default gen_random_uuid(),
  rubrica_id    uuid not null references taxonomia_item(id),
  tipo          text not null check (tipo in ('Fixa','Projeto','Tributo','Investimento')),
  projeto_id    uuid references projeto(id),
  descricao     text,
  mes_competencia date not null,
  valor         numeric(14,2) not null,
  prazo_dias    smallint not null default 0,
  situacao      text not null default 'Prevista',
  criado_em     timestamptz not null default now()
);

-- mês de caixa = fim do mês de competência + prazo
create or replace function mes_caixa(p_competencia date, p_prazo int)
returns date language sql immutable as $$
  select date_trunc('month',
           (date_trunc('month', p_competencia) + interval '1 month - 1 day')::date
           + (p_prazo || ' days')::interval)::date
$$;

-- =====================================================================
--  9. ROW LEVEL SECURITY
-- =====================================================================

-- Tabelas ABERTAS: leitura para qualquer autenticado; escrita por papel.
do $$
declare t text;
begin
  foreach t in array array[
    'pessoa','pessoa_papel','taxonomia_item','parametro','cliente',
    'oportunidade','revisao','revisao_hh','projeto','projeto_hh_baseline',
    'projeto_equipe','projeto_marco','projeto_risco','medicao_fisica']
  loop
    execute format('alter table %I enable row level security', t);
    execute format(
      'create policy %I_sel on %I for select to authenticated using (true)', t, t);
  end loop;
end $$;

-- Escrita no funil: Novos Negócios e Diretoria.
create policy oportunidade_ins on oportunidade for insert to authenticated
  with check (tem_papel('CNN','DT','DE'));
create policy oportunidade_upd on oportunidade for update to authenticated
  using (tem_papel('CNN','DT','DE'));

create policy revisao_ins on revisao for insert to authenticated
  with check (tem_papel('CNN','DT','DE','GCM'));
create policy revisao_upd on revisao for update to authenticated
  using (tem_papel('CNN','DT','DE','GCM'));

-- Escrita em projetos: Gestão de Projetos e Diretoria.
create policy projeto_ins on projeto for insert to authenticated
  with check (tem_papel('CNN','GPR','DE','DT'));
create policy projeto_upd on projeto for update to authenticated
  using (tem_papel('GPR','CPR','DE','DT'));

create policy medicao_ins on medicao_fisica for insert to authenticated
  with check (tem_papel('CPR','GPR'));
create policy medicao_upd on medicao_fisica for update to authenticated
  using (tem_papel('CPR','GPR'));

-- ---------- TIMESHEET: cada um só o seu ----------
alter table apontamento enable row level security;

create policy apont_proprio_sel on apontamento for select to authenticated
  using (pessoa_id = minha_pessoa_id());
create policy apont_proprio_ins on apontamento for insert to authenticated
  with check (pessoa_id = minha_pessoa_id());
create policy apont_proprio_upd on apontamento for update to authenticated
  using (pessoa_id = minha_pessoa_id());
create policy apont_proprio_del on apontamento for delete to authenticated
  using (pessoa_id = minha_pessoa_id());

-- Gestão de Projetos vê os apontamentos dos seus projetos.
create policy apont_gestao_sel on apontamento for select to authenticated
  using (tem_papel('GPR','GCM','DE','DT')
         or (tem_papel('CPR') and projeto_id in (
               select id from projeto where coordenador_id = minha_pessoa_id())));

-- ---------- RESTRITAS: custo, margem, faturamento, financeiro ----------
do $$
declare t text;
begin
  foreach t in array array[
    'revisao_economico','custo_recurso','tributo','medicao_financeira',
    'faturamento','projeto_economico','receita_evento','despesa_evento']
  loop
    execute format('alter table %I enable row level security', t);
    execute format(
      'create policy %I_restrito on %I for all to authenticated '
      'using (pode_ver_restrito()) with check (pode_ver_restrito())', t, t);
  end loop;
end $$;

-- Administração de taxonomias e parâmetros: só Diretoria.
create policy tax_w on taxonomia_item for all to authenticated
  using (tem_papel('DE','DT')) with check (tem_papel('DE','DT'));
create policy par_w on parametro for all to authenticated
  using (tem_papel('DE','DT')) with check (tem_papel('DE','DT'));

-- =====================================================================
--  10. VIEWS DE APOIO
-- =====================================================================

create view v_revisao as
select r.*, o.codigo || '-R' || lpad(r.numero::text, 2, '0') as codigo_revisao,
       o.codigo as codigo_oportunidade
from revisao r join oportunidade o on o.id = r.oportunidade_id;

-- HH realizado por projeto, função e nível — a moeda que atravessa a parede.
create view v_hh_realizado as
select a.projeto_id,
       date_trunc('month', a.data)::date as mes,
       (ti.extra->>'funcao_id')::uuid    as funcao_id,
       p.nivel,
       p.tipo_vinculo,
       sum(a.horas) as hh
from apontamento a
join pessoa p on p.id = a.pessoa_id
join taxonomia_item ti on ti.id = p.cargo_id
where a.projeto_id is not null
group by 1,2,3,4,5;

-- Custo realizado: HH × custo vigente no mês do apontamento. RESTRITO.
create view v_custo_realizado as
select h.projeto_id, h.mes, h.funcao_id, h.nivel,
       h.hh, cr.valor_hora,
       case when h.tipo_vinculo = 'Terceirizada' then 0
            else h.hh * cr.valor_hora end as custo
from v_hh_realizado h
left join custo_recurso cr
  on cr.funcao_id = h.funcao_id and cr.nivel = h.nivel
 and h.mes between cr.vigencia_inicio and cr.vigencia_fim;

-- =====================================================================
--  11. SEEDS MÍNIMOS
-- =====================================================================

insert into taxonomia_item (tipo, codigo, rotulo, ordem) values
  ('grupo','I','I - Infraestrutura',1),
  ('grupo','E','E - Edificações',2),
  ('funcao','FUN-01','Projetista',1),
  ('funcao','FUN-02','Engenheiro / Arquiteto / Analista',2),
  ('funcao','FUN-03','Coordenador',3),
  ('funcao','FUN-04','Gerente',4),
  ('funcao','FUN-05','Diretor',5);

-- Cargos apontam para a função (grupo de custo) via extra.funcao_id.
insert into taxonomia_item (tipo, codigo, rotulo, ordem, extra)
select 'cargo', c.cod, c.rot, c.ord,
       jsonb_build_object('funcao_id', (select id from taxonomia_item
                                        where tipo='funcao' and codigo=c.fun))
from (values
  ('CAR-01','Estagiário',1,'FUN-01'), ('CAR-02','Técnico',2,'FUN-01'),
  ('CAR-03','Desenhista',3,'FUN-01'), ('CAR-04','Projetista',4,'FUN-01'),
  ('CAR-05','Engenheiro',5,'FUN-02'), ('CAR-06','Arquiteto',6,'FUN-02'),
  ('CAR-07','Analista',7,'FUN-02'),
  ('CAR-08','Coordenador de Projetos',8,'FUN-03'),
  ('CAR-09','Coordenador de Novos Negócios',9,'FUN-03'),
  ('CAR-10','Gerente de Projetos',10,'FUN-04'),
  ('CAR-11','Diretor',11,'FUN-05')
) as c(cod,rot,ord,fun);

insert into taxonomia_item (tipo, codigo, rotulo, ordem) values
  ('atividade_nao_projeto','ANP-01','Apoio a Novos Negócios (orçamento e proposta)',1),
  ('atividade_nao_projeto','ANP-02','Comercial / visita a cliente',2),
  ('atividade_nao_projeto','ANP-03','Administrativo / gestão interna',3),
  ('atividade_nao_projeto','ANP-04','Treinamento / capacitação',4),
  ('atividade_nao_projeto','ANP-05','Férias / afastamento',5),
  ('atividade_nao_projeto','ANP-06','Feriado',6),
  ('atividade_nao_projeto','ANP-07','Sem alocação (ocioso)',7);

insert into parametro (chave, valor, descricao) values
  ('faixa_limite_contrato', 100000, 'Divide contratos pequenos de grandes'),
  ('faixa_tolerancia', 0.05, 'Dentro dessa margem do limite, vale a margem maior'),
  ('margem_minima_pequeno', 0.20, 'Margem líquida'),
  ('margem_alvo_pequeno', 0.25, 'Margem líquida'),
  ('margem_minima_grande', 0.15, 'Margem líquida'),
  ('margem_alvo_grande', 0.20, 'Margem líquida'),
  ('alcada_dt_teto', 500000, 'Acima disso, DT e DE em conjunto'),
  ('bdi_cheio_referencia', 0.40, 'A recalibrar — ver documento E3'),
  ('bdi_reduzido_referencia', 0.28, 'Sem parcela tributária'),
  ('prazo_pagamento_padrao', 30, 'Dias após medição e emissão de NF'),
  ('desvio_hh_atencao', 0.05, 'HH consumido acima do avanço, em pontos'),
  ('desvio_hh_alerta', 0.10, 'Idem, nível de ação'),
  ('prob_estagio_0', 0.05, 'Funil ponderado'),
  ('prob_estagio_1', 0.15, 'Funil ponderado'),
  ('prob_estagio_2', 0.30, 'Funil ponderado'),
  ('prob_estagio_3', 0.50, 'Funil ponderado'),
  ('prob_estagio_4', 0.70, 'Funil ponderado');

-- Tributos: decomposição PROVISÓRIA, soma 18%. Confirmar com a contabilidade.
insert into tributo (nome, aliquota, base, vigencia_inicio) values
  ('PIS',              0.0065, 'Faturamento', '2026-01-01'),
  ('COFINS',           0.0300, 'Faturamento', '2026-01-01'),
  ('ISS',              0.0500, 'Faturamento', '2026-01-01'),
  ('IRPJ (presumido)', 0.0600, 'Lucro',       '2026-01-01'),
  ('CSLL (presumido)', 0.0335, 'Lucro',       '2026-01-01');
