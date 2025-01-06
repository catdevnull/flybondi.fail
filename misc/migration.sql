create table aerolineas_latest_flight_status(
  aerolineas_flight_id TEXT not null primary key,
  last_updated TIMESTAMP not null,
  json JSONB not null
);

create table airfleets_matriculas(
  fetched_at timestamp not null,
  matricula text not null,
  aeronave text not null,
  msn text not null,
  compania_aerea text not null,
  situacion text not null,
  detail_url text not null,
  edad_del_avion real not null,
  config_de_asientos text not null
);