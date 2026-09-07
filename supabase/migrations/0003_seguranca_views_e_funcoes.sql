-- =====================================================================
--  0003 — Fechamento das views e endurecimento das funções
--
--  Três correções, todas de segurança. A migração 0001 não é editada:
--  o que estava errado é corrigido aqui.
--
--  1. VIEW SEM security_invoker VAZA DADO RESTRITO.
--     No PostgreSQL, uma view comum é executada com os privilégios do
--     DONO dela — não de quem consulta. As views criadas em 0001
--     pertencem ao papel que roda a migração, que ignora RLS. Logo:
--
--       select * from v_custo_realizado;
--
--     devolveria custo horário e custo realizado para QUALQUER usuário
--     autenticado, passando por cima da policy de custo_recurso. O mesmo
--     vale para v_hh_realizado, que leria o apontamento de todo mundo,
--     furando a regra de "cada um só o seu".
--
--     Correção: security_invoker = on em todas as views. A partir daqui
--     a view enxerga exatamente o que quem consulta enxergaria.
--
--  2. Guarda explícita em v_custo_realizado. Com security_invoker a view
--     já não devolve custo para quem não pode vê-lo, mas devolveria as
--     linhas de HH com valor nulo. Zero linha é resposta mais honesta —
--     e é o que o teste de RLS verifica.
--
--  3. search_path fixo nas funções. Sem isso, um schema no caminho de
--     busca do chamador pode sequestrar a resolução de nomes dentro da
--     função. Vale principalmente para as que rodam em trigger.
-- =====================================================================

-- ---------------------------------------------------------------------
--  1. Views passam a respeitar a RLS de quem consulta
-- ---------------------------------------------------------------------

alter view v_revisao        set (security_invoker = on);
alter view v_hh_realizado   set (security_invoker = on);
alter view v_custo_realizado set (security_invoker = on);

-- ---------------------------------------------------------------------
--  2. v_custo_realizado devolve zero linha para quem não é GCM/DE/DT
--     Mesmas colunas, mesma ordem, mesmos tipos — só a guarda é nova.
-- ---------------------------------------------------------------------

create or replace view v_custo_realizado as
select h.projeto_id, h.mes, h.funcao_id, h.nivel,
       h.hh, cr.valor_hora,
       case when h.tipo_vinculo = 'Terceirizada' then 0
            else h.hh * cr.valor_hora end as custo
from v_hh_realizado h
left join custo_recurso cr
  on cr.funcao_id = h.funcao_id and cr.nivel = h.nivel
 and h.mes between cr.vigencia_inicio and cr.vigencia_fim
where pode_ver_restrito();

alter view v_custo_realizado set (security_invoker = on);

comment on view v_custo_realizado is
  'RESTRITO — GCM, DE, DT. Zero linha para os demais.';

-- Nada é exposto ao papel anônimo. Só sessão autenticada lê.
revoke all on v_revisao, v_hh_realizado, v_custo_realizado from anon;
grant select on v_revisao, v_hh_realizado, v_custo_realizado to authenticated;

-- ---------------------------------------------------------------------
--  3. search_path fixo. Corpo idêntico ao de 0001.
-- ---------------------------------------------------------------------

create or replace function tem_papel(variadic ps papel[]) returns boolean
language sql stable set search_path = public as $$ select meus_papeis() && ps $$;

create or replace function pode_ver_restrito() returns boolean
language sql stable set search_path = public as $$ select tem_papel('GCM','DE','DT') $$;

create or replace function eh_taxonomia(p_id uuid, p_tipo taxonomia_tipo)
returns boolean language sql stable set search_path = public as $$
  select exists (select 1 from taxonomia_item where id = p_id and tipo = p_tipo)
$$;

create or replace function param(p_chave text, p_data date default current_date)
returns numeric language sql stable set search_path = public as $$
  select valor from parametro
  where chave = p_chave and p_data between vigencia_inicio and vigencia_fim
  order by vigencia_inicio desc limit 1
$$;

create or replace function carga_tributaria(p_base text, p_data date default current_date)
returns numeric language sql stable set search_path = public as $$
  select coalesce(sum(aliquota),0) from tributo
  where (p_base is null or base = p_base)
    and p_data between vigencia_inicio and vigencia_fim
$$;

create or replace function mes_caixa(p_competencia date, p_prazo int)
returns date language sql immutable set search_path = public as $$
  select date_trunc('month',
           (date_trunc('month', p_competencia) + interval '1 month - 1 day')::date
           + (p_prazo || ' days')::interval)::date
$$;

create or replace function valida_tipo_taxonomia() returns trigger
language plpgsql set search_path = public as $$
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

create or replace function checa_tap() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.projeto_id is not null
     and not exists (select 1 from projeto
                     where id = new.projeto_id and tap_assinado) then
    raise exception 'Projeto sem TAP assinado não aceita apontamento de horas';
  end if;
  return new;
end $$;

-- ---------------------------------------------------------------------
--  4. alterado_em deixa de depender da aplicação
--     Convenção do CLAUDE.md: toda tabela tem alterado_em. Se quem
--     escreve esquecer de preencher, o carimbo mente. Trigger resolve.
-- ---------------------------------------------------------------------

create or replace function toca_alterado_em() returns trigger
language plpgsql set search_path = public as $$
begin
  new.alterado_em := now();
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array[
    'pessoa','oportunidade','revisao','revisao_economico','projeto',
    'apontamento','projeto_economico']
  loop
    execute format(
      'create trigger %I_alterado before update on %I
       for each row execute function toca_alterado_em()', t, t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
--  5. Índice das telas de administração de taxonomia
-- ---------------------------------------------------------------------

create index if not exists taxonomia_item_tipo_ordem_idx
  on taxonomia_item (tipo, ordem, rotulo);
