create table aerolineas_latest_flight_status(
  aerolineas_flight_id TEXT not null primary key,
  last_updated TIMESTAMP not null,
  json JSONB not null,
  stda_parsed TIMESTAMP
);

-- JSON field indexes
CREATE INDEX IF NOT EXISTS idx_flight_mov ON aerolineas_latest_flight_status ((json->>'mov'));
CREATE INDEX IF NOT EXISTS idx_flight_arpt ON aerolineas_latest_flight_status ((json->>'arpt'));
CREATE INDEX IF NOT EXISTS idx_flight_dest ON aerolineas_latest_flight_status ((json->>'destorig'));
CREATE INDEX IF NOT EXISTS idx_flight_xdate ON aerolineas_latest_flight_status ((json->>'x_date'));
CREATE INDEX IF NOT EXISTS aerolineas_latest_flight_status_json_matricula ON aerolineas_latest_flight_status ((json->>'matricula'));
CREATE INDEX IF NOT EXISTS aerolineas_latest_flight_status_json_mov ON aerolineas_latest_flight_status ((json->>'mov'));
CREATE INDEX IF NOT EXISTS aerolineas_latest_flight_status_json_nro ON aerolineas_latest_flight_status ((json->>'nro'));

-- stda_parsed indexes
CREATE INDEX IF NOT EXISTS aerolineas_latest_flight_status_stda_parsed ON aerolineas_latest_flight_status (stda_parsed);
CREATE INDEX IF NOT EXISTS idx_aerolineas_stda_parsed ON aerolineas_latest_flight_status (stda_parsed);

-- Composite indexes
CREATE INDEX IF NOT EXISTS aerolineas_latest_flight_status_json_movstda_parsed ON aerolineas_latest_flight_status ((json->>'mov'), stda_parsed);
CREATE INDEX IF NOT EXISTS idx_flight_mov_stda ON aerolineas_latest_flight_status ((json->>'mov'), stda_parsed);
CREATE INDEX IF NOT EXISTS idx_flight_mov_stda_date ON aerolineas_latest_flight_status ((json->>'mov'), date(stda_parsed));

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