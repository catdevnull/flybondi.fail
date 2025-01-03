import type { PageServerLoad } from './$types';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { sql, type Vuelo } from '$lib';

dayjs.extend(utc);
dayjs.extend(timezone);

export const load: PageServerLoad = async ({ url, platform }) => {
	const tsz = 'America/Argentina/Buenos_Aires';
	const dateQ = url.searchParams.get('date');
	const date = dateQ ? dayjs(dateQ).tz(tsz, true) : dayjs().tz(tsz);

	const start = date.startOf('day');
	const end = date.endOf('day');

	const tomorrowStart = start.add(1, 'day');
	const tomorrowEnd = end.add(3, 'day');

	const condition = sql`json->>'atda' != '' AND json->>'mov' = 'D'`;
	const vuelos = await sql<Vuelo[]>`
    WITH flight_data AS (
      SELECT *,
        (to_timestamp(json->>'stda' || ' ' || to_char(last_updated, 'YYYY'), 'DD/MM HH24:MI YYYY') AT TIME ZONE 'UTC' AT TIME ZONE 'America/Buenos_Aires') AS stda,
        CASE 
          WHEN LENGTH(json->>'atda') > 0 THEN (to_timestamp(json->>'atda' || ' ' || to_char(last_updated, 'YYYY'), 'DD/MM HH24:MI YYYY') AT TIME ZONE 'UTC' AT TIME ZONE 'America/Buenos_Aires')
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

	return {
		vuelos: vuelos.filter((vuelo) => vuelo.stda >= start.toDate() && vuelo.stda <= end.toDate()),
		date: date.toDate(),
		hasYesterdayData: start.subtract(1, 'day').isAfter('2024-12-21', 'day'),
		hasTomorrowData: vuelos.some(
			(vuelo) => vuelo.stda >= tomorrowStart.toDate() && vuelo.stda <= tomorrowEnd.toDate()
		)
	};
};
