import type { PageServerLoad } from './$types';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { sql, type Vuelo } from '$lib';

dayjs.extend(utc);
dayjs.extend(timezone);

const AVAILABLE_DATES_CACHE_MS = 5 * 60 * 1000;

let availableDatesCache:
	| {
			expiresAt: number;
			dates: (string | Date)[];
	  }
	| undefined;

function getAvailableDates() {
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

export const load: PageServerLoad = async ({ url, params, platform, setHeaders }) => {
	const tsz = 'America/Argentina/Buenos_Aires';
	const date = dayjs(params.date).tz(tsz, true);

	const start = date.startOf('day');
	const end = date.endOf('day');

	const tomorrowStart = start.add(1, 'day');
	const tomorrowEnd = end.add(3, 'day');

	const [availableDates, vuelos, tomorrowData] = await Promise.all([
		getAvailableDates(),
		sql<Vuelo[]>`
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
      AND stda_parsed >= ${start.toDate()} AND stda_parsed <= ${end.toDate()};
    `,
		sql<{ exists: boolean }[]>`
			SELECT EXISTS (
				SELECT 1
				FROM aerolineas_latest_flight_status
				WHERE json->>'mov' = 'D'
					AND stda_parsed >= ${tomorrowStart.toDate()}
					AND stda_parsed <= ${tomorrowEnd.toDate()}
			);
		`
	]);

	setHeaders({
		'cache-control': 'public, max-age=60'
	});

	return {
		vuelos,
		date: date.toDate(),
		hasYesterdayData: start.subtract(1, 'day').isAfter('2024-12-21', 'day'),
		hasTomorrowData: tomorrowData[0]?.exists ?? false,
		hasCustomDate: url.searchParams.has('date'),
		aerolineaEnUrl: url.searchParams.get('aerolinea'),
		availableDates
	};
};
