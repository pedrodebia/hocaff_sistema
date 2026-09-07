-- =====================================================================
--  0004 — Vigência de parâmetro deixa de ser promessa
--
--  A regra 11 do CLAUDE.md diz que reajuste fecha a vigência atual e abre
--  linha nova, nunca sobrescreve. Em 0001 isso ficou como combinado entre
--  quem escreve o código. Aqui vira restrição de banco, como já era para
--  `custo_recurso`.
--
--  1. Duas vigências da mesma chave não podem se sobrepor.
--  2. `reajustar_parametro()` faz fechar-e-abrir numa transação só, para
--     não existir instante em que a política ficou sem valor vigente.
-- =====================================================================

-- ---------------------------------------------------------------------
--  1. Sem sobreposição. btree_gist (já instalado em 0001) é o que permite
--     combinar igualdade de texto com interseção de intervalo.
-- ---------------------------------------------------------------------

alter table parametro
  add constraint parametro_vigencia_sem_sobreposicao
  exclude using gist (
    chave with =,
    daterange(vigencia_inicio, vigencia_fim, '[]') with &&
  );

alter table parametro
  add constraint parametro_vigencia_coerente
  check (vigencia_fim >= vigencia_inicio);

-- ---------------------------------------------------------------------
--  2. O reajuste como operação única
--
--  SECURITY INVOKER de propósito: a RLS de `parametro` continua valendo,
--  então quem não é DE ou DT não consegue reajustar por aqui tampouco.
-- ---------------------------------------------------------------------

create or replace function reajustar_parametro(
  p_chave     text,
  p_valor     numeric,
  p_inicio    date,
  p_descricao text default null
) returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_id        uuid;
  v_descricao text;
  v_fechadas  int;
begin
  if p_chave is null or btrim(p_chave) = '' then
    raise exception 'Informe a chave do parâmetro';
  end if;
  if p_inicio is null then
    raise exception 'Informe a data de início da nova vigência';
  end if;

  -- Reajuste anda para a frente. Corrigir o passado reescreveria a
  -- história de propostas e orçamentos já fechados com aquele valor.
  if exists (
    select 1 from parametro
    where chave = p_chave and vigencia_inicio >= p_inicio
  ) then
    raise exception
      'Já existe vigência de % começando em % ou depois. Reajuste não retroage.',
      p_chave, to_char(p_inicio, 'DD/MM/YYYY');
  end if;

  select descricao into v_descricao
  from parametro
  where chave = p_chave
  order by vigencia_inicio desc
  limit 1;

  update parametro
     set vigencia_fim = p_inicio - 1
   where chave = p_chave
     and vigencia_fim >= p_inicio;

  get diagnostics v_fechadas = row_count;

  if v_fechadas = 0 and v_descricao is null then
    raise exception 'Parâmetro % não existe. Crie-o antes de reajustar.', p_chave;
  end if;

  insert into parametro (chave, valor, descricao, vigencia_inicio)
  values (p_chave, p_valor, coalesce(p_descricao, v_descricao), p_inicio)
  returning id into v_id;

  return v_id;
end $$;

comment on function reajustar_parametro is
  'Fecha a vigência corrente da chave e abre a nova, atomicamente. '
  'Único caminho de reajuste — UPDATE direto no valor reescreve a história.';

revoke all on function reajustar_parametro(text, numeric, date, text) from public;
grant execute on function reajustar_parametro(text, numeric, date, text) to authenticated;
