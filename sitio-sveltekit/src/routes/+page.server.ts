import type { PageServerLoad } from './$types';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { sql, type Vuelo } from '$lib';
import type { MaybeRow, PendingQuery, RowList, Sql } from 'postgres';

dayjs.extend(utc);
dayjs.extend(timezone);

const analyze: Sql<{}> = (async (...args: Parameters<typeof sql>) => {
	const described = await sql(...args).describe();
	console.log(described.string, args.slice(1));
	return await sql(...args);
}) as Sql<{}>;

export const load: PageServerLoad = async ({ url, platform, setHeaders }) => {
	const tsz = 'America/Argentina/Buenos_Aires';
	const dateQ = url.searchParams.get('date');
	const date = dateQ ? dayjs(dateQ).tz(tsz, true) : dayjs().tz(tsz).subtract(1, 'day');

	const start = date.startOf('day');
	const end = date.endOf('day');

	const tomorrowStart = start.add(1, 'day');
	const tomorrowEnd = end.add(3, 'day');

	const t1 = performance.now();
	// Recursive CTE for loose index scan — avoids seq scan on large table (303ms → 44ms)
	const availableDatesQuery = await analyze<{ date: string }[]>`
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
	`;
	const t2 = performance.now();
	console.log(`[+page.server.ts] availableDates query: ${(t2 - t1).toFixed(2)}ms`);
	const availableDates = availableDatesQuery.map((d) => d.date);

	const t3 = performance.now();
	const vuelos = await analyze<Vuelo[]>`
    SELECT
      *,
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
    LEFT JOIN airfleets_matriculas ON matricula = json->>'matricula'
    WHERE json->>'mov' = 'D'
      AND stda_parsed >= ${start.toDate()} AND stda_parsed < ${tomorrowEnd.toDate()};
    `;
	sql``;
	const t4 = performance.now();
	console.log(`[+page.server.ts] vuelos query: ${(t4 - t3).toFixed(2)}ms`);

	setHeaders({
		'cache-control': 'public, max-age=60'
	});

	for (const vuelo of vuelos) {
		// @ts-ignore
		delete vuelo.aeronave;
		// @ts-ignore
		delete vuelo.msn;
		// @ts-ignore
		delete vuelo.compania_aerea;
		// @ts-ignore
		delete vuelo.situacion;
		// @ts-ignore
		delete vuelo.detail_url;
		// @ts-ignore
		delete vuelo.edad_del_avion;
	}

	return {
		vuelos: vuelos.filter((vuelo) => vuelo.stda >= start.toDate() && vuelo.stda <= end.toDate()),
		date: date.toDate(),
		hasYesterdayData: start.subtract(1, 'day').isAfter('2024-12-21', 'day'),
		hasTomorrowData: vuelos.some(
			(vuelo) => vuelo.stda >= tomorrowStart.toDate() && vuelo.stda <= tomorrowEnd.toDate()
		),
		hasCustomDate: url.searchParams.has('date'),
		aerolineaEnUrl: url.searchParams.get('aerolinea'),
		availableDates
	};
};
