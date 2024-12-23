CREATE TYPE flights_relative_to_airport AS ENUM ('arrivals', 'departures');

create table flightstats_snapshots(
  url TEXT not null,
  fetched_at TIMESTAMP not null,
  b2_raw_path TEXT not null,
  
  airport_iata TEXT not null,
  flights_relative_to_airport flights_relative_to_airport not null,
  last_updated_at TIMESTAMP,
  date DATE not null,

  -- JSON
  entries TEXT not null, -- FlightstatsSnapshotEntries
  PRIMARY KEY (b2_raw_path)
);

create table aerolineas_snapshots(
  url TEXT not null,
  fetched_at TIMESTAMP not null,
  b2_raw_path TEXT not null,
  
  airport_iata TEXT not null,
  flights_relative_to_airport flights_relative_to_airport not null,
  date DATE not null,

  -- JSON
  entries TEXT not null, -- array<AerolineasFlightData>
  PRIMARY KEY (b2_raw_path)
);