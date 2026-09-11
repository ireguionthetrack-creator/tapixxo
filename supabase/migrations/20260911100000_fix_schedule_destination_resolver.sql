begin;

-- `active` también es una columna de salida de la función. Debe estar
-- calificada para que PostgreSQL no la confunda con un parámetro PL/pgSQL.
create or replace function public.resolve_public_code_destination(p_code text,p_scanned_at timestamptz default now())
returns table(code_id uuid,code text,destination_url text,active boolean,company_id uuid,group_id uuid,schedule_id uuid,schedule_rule_id uuid,destination_source text)
language plpgsql security definer set search_path=public as $$
declare c public.codes%rowtype; v_company uuid; tz text; s public.code_schedules%rowtype; r public.code_schedule_rules%rowtype; local_ts timestamp; d date; t time;
begin
 select * into c from public.codes where codes.code=p_code and codes.active=true; if not found then return; end if;
 v_company:=c.company_id; if v_company is null then select company_id into v_company from public.code_groups where id=c.group_id; end if;
 select cs.* into s from public.code_schedule_assignments a join public.code_schedules cs on cs.id=a.schedule_id where a.code_id=c.id and cs.enabled;
 select time_zone into tz from public.companies where id=v_company;
 if found and tz is not null then
  local_ts:=timezone(tz,p_scanned_at); d:=local_ts::date;t:=local_ts::time;
  select x.* into r from public.code_schedule_rules x where x.schedule_id=s.id and (s.schedule_kind='daily' or (x.start_time<x.end_time and d=s.schedule_date) or (x.start_time>x.end_time and ((d=s.schedule_date and t>=x.start_time) or (d=s.schedule_date+1 and t<x.end_time)))) and ((x.start_time<x.end_time and t>=x.start_time and t<x.end_time) or (x.start_time>x.end_time and (t>=x.start_time or t<x.end_time))) limit 1;
  if found then return query select c.id,c.code,coalesce(r.destination_url,c.destination_url),c.active,v_company,c.group_id,s.id,r.id,'schedule_rule';return;end if;
  if (s.schedule_kind='daily' or d=s.schedule_date) and s.after_behavior='keep_last' then
    select x.* into r from public.code_schedule_rules x where x.schedule_id=s.id and x.start_time<x.end_time and x.end_time<=t order by x.end_time desc limit 1;
    if found then return query select c.id,c.code,coalesce(r.destination_url,c.destination_url),c.active,v_company,c.group_id,s.id,r.id,'schedule_after_last';return;end if;
  end if;
  if (s.schedule_kind='daily' or d=s.schedule_date) and s.after_behavior='custom_destination' then return query select c.id,c.code,s.after_custom_destination_url,c.active,v_company,c.group_id,s.id,null::uuid,'schedule_after_custom';return;end if;
 end if;
 return query select c.id,c.code,c.destination_url,c.active,v_company,c.group_id,null::uuid,null::uuid,'primary';
end;$$;

revoke all on function public.resolve_public_code_destination(text, timestamptz) from public, anon, authenticated;
grant execute on function public.resolve_public_code_destination(text, timestamptz) to service_role;
notify pgrst, 'reload schema';
commit;
