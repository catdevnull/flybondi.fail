import { sql, type Vuelo } from '$lib';

const AVAILABLE_DATES_CACHE_MS = 5 * 60 * 1000;

let availableDatesCache:
	| {
			expiresAt: number;
			dates: (string | Date)[];
	  }
	| undefined;

export function getAvailableFlightDates() {
	const now = Date.now();
	if (availableDatesCache && availableDatesCache.expiresAt > now) {
		return Promise.resolve(availableDatesCache.dates);
	}

	return sql<{ date: string | Date }[]>`
		WITH RECURSIVE dates AS (
			(SELECT DATE(stda_parsed) as date
			 FROM aerolineas_latest_flight_status
			 WHERE json->>'mov' = 'D'
			   AND DATE(stda_parsed) >= '2024-12-24'
			   AND DATE(stda_parsed) <= CURRENT_DATE
			 ORDER BY DATE(stda_parsed) DESC
			 LIMIT 1)
			UNION ALL
			SELECT (SELECT DATE(stda_parsed)
			        FROM aerolineas_latest_flight_status
			        WHERE json->>'mov' = 'D'
			          AND DATE(stda_parsed) < d.date
			          AND DATE(stda_parsed) >= '2024-12-24'
			        ORDER BY DATE(stda_parsed) DESC
			        LIMIT 1)
			FROM dates d
			WHERE d.date IS NOT NULL
		)
		SELECT date FROM dates WHERE date IS NOT NULL ORDER BY date DESC;
	`.then((rows) => {
		const dates = rows.map((d) => d.date);
		availableDatesCache = {
			expiresAt: now + AVAILABLE_DATES_CACHE_MS,
			dates
		};
		return dates;
	});
}

export function getRecentAvailableFlightDates(limit: number) {
	return sql<{ date: string | Date }[]>`
		WITH RECURSIVE dates AS (
			(SELECT DATE(stda_parsed) as date, 1 as n
			 FROM aerolineas_latest_flight_status
			 WHERE json->>'mov' = 'D'
			   AND DATE(stda_parsed) >= '2024-12-24'
			   AND DATE(stda_parsed) <= CURRENT_DATE
			 ORDER BY DATE(stda_parsed) DESC
			 LIMIT 1)
			UNION ALL
			SELECT previous_date.date, d.n + 1
			FROM dates d
			CROSS JOIN LATERAL (
				SELECT DATE(stda_parsed) as date
				FROM aerolineas_latest_flight_status
				WHERE json->>'mov' = 'D'
					AND DATE(stda_parsed) < d.date
					AND DATE(stda_parsed) >= '2024-12-24'
				ORDER BY DATE(stda_parsed) DESC
				LIMIT 1
			) previous_date
			WHERE d.date IS NOT NULL
				AND d.n < ${limit}
		)
		SELECT date FROM dates WHERE date IS NOT NULL ORDER BY date DESC;
	`.then((rows) => rows.map((row) => row.date));
}

export function getDepartureFlightsBetween(start: Date, end: Date) {
	return sql<Vuelo[]>`
		SELECT
			aerolineas_latest_flight_status.aerolineas_flight_id,
			aerolineas_latest_flight_status.last_updated,
			jsonb_build_object(
				'id', json->>'id',
				'mov', json->>'mov',
				'nro', json->>'nro',
				'arpt', json->>'arpt',
				'stda', json->>'stda',
				'atda', json->>'atda',
				'matricula', json->>'matricula',
				'aerolinea', json->>'aerolinea',
				'idaerolinea', json->>'idaerolinea',
				'IATAdestorig', json->>'IATAdestorig',
				'estes', json->>'estes'
			) AS json,
			json->>'matricula' AS matricula,
			COALESCE(airfleets_matriculas.config_de_asientos, '') AS config_de_asientos,
			stda_parsed AT TIME ZONE 'America/Argentina/Buenos_Aires' AS stda,
			CASE
				WHEN LENGTH(json->>'atda') > 0 THEN (to_timestamp(json->>'atda' || ' ' || split_part(json->>'x_date', '-', 1), 'DD/MM HH24:MI YYYY')::timestamp without time zone AT TIME ZONE 'America/Argentina/Buenos_Aires')
			END AS atda,
			CASE
				WHEN LENGTH(json->>'atda') > 0 THEN CAST(EXTRACT(EPOCH FROM (
					(to_timestamp(json->>'atda' || ' ' || split_part(json->>'x_date', '-', 1), 'DD/MM HH24:MI YYYY')::timestamp without time zone AT TIME ZONE 'America/Argentina/Buenos_Aires')
					- (stda_parsed AT TIME ZONE 'America/Argentina/Buenos_Aires')
				)) AS real)
			END AS delta
		FROM aerolineas_latest_flight_status
		LEFT JOIN airfleets_matriculas ON airfleets_matriculas.matricula = json->>'matricula'
		WHERE json->>'mov' = 'D'
			AND stda_parsed >= ${start}
			AND stda_parsed <= ${end};
	`;
}
