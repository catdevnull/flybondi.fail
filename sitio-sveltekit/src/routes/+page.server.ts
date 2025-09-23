import type { PageServerLoad } from './$types';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { sql, type Vuelo } from '$lib';

dayjs.extend(utc);
dayjs.extend(timezone);

export const load: PageServerLoad = async ({ url, platform, setHeaders }) => {
	const tsz = 'America/Argentina/Buenos_Aires';
	const dateQ = url.searchParams.get('date');
	const date = dateQ ? dayjs(dateQ).tz(tsz, true) : dayjs().tz(tsz).subtract(1, 'day');

	const start = date.startOf('day');
	const end = date.endOf('day');

	const tomorrowStart = start.add(1, 'day');
	const tomorrowEnd = end.add(3, 'day');

	const condition = sql`json->>'mov' = 'D'`;
	const vuelos = await sql<Vuelo[]>`
    WITH flight_data AS (
      SELECT *,
        (to_timestamp(
          json->>'stda' || ' ' || 
          CASE 
            WHEN json->>'stda' LIKE '31/12%' AND split_part(json->>'x_date', '-', 2) = '01' 
            THEN (split_part(json->>'x_date', '-', 1)::int - 1)::text
            ELSE split_part(json->>'x_date', '-', 1)
          END,
          'DD/MM HH24:MI YYYY'
        )::timestamp without time zone AT TIME ZONE 'America/Argentina/Buenos_Aires') AS stda,
        CASE 
          WHEN LENGTH(json->>'atda') > 0 THEN (to_timestamp(json->>'atda' || ' ' || split_part(json->>'x_date', '-', 1), 'DD/MM HH24:MI YYYY')::timestamp without time zone AT TIME ZONE 'America/Argentina/Buenos_Aires')
        END AS atda
      FROM aerolineas_latest_flight_status
      left join airfleets_matriculas
      on matricula = json->>'matricula'
      WHERE ${condition}
    )
    SELECT
      *, CAST(EXTRACT(EPOCH FROM (atda - stda)) AS real) as delta
    FROM flight_data
    WHERE stda >= ${start.toDate()} AND stda < ${tomorrowEnd.toDate()};
    `;

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
		aerolineaEnUrl: url.searchParams.get('aerolinea')
	};
};
