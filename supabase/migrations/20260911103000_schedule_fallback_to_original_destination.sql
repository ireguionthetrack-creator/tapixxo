begin;

-- Los horarios son temporales: al terminar una franja, la placa vuelve a
-- `codes.destination_url`, que es el enlace original configurado.
update public.code_schedules
set after_behavior = 'default_destination',
    after_custom_destination_url = null,
    updated_at = now()
where after_behavior <> 'default_destination'
   or after_custom_destination_url is not null;

commit;
