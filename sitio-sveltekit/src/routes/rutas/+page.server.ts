import type { PageServerLoad } from './$types';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { sql } from '$lib';
import { AEROPUERTOS_FLYBONDI } from '@/aeropuertos-flybondi';
import AIRPORTS_ALIAS from '$lib/aerolineas-airports-subset-alias.json';

dayjs.extend(utc);
dayjs.extend(timezone);

const VALID_AIRPORTS = AEROPUERTOS_FLYBONDI.filter(
	(code) => code in AIRPORTS_ALIAS
);

export const load: PageServerLoad = async ({ setHeaders }) => {
	const tsz = 'America/Argentina/Buenos_Aires';
	const end = dayjs().tz(tsz).subtract(1, 'day').endOf('day');
	const start = end.subtract(30, 'days').startOf('day');

	const routes = await sql`
    WITH flight_data AS (
      SELECT
        json->>'arpt' as origin,
        json->>'IATAdestorig' as destination,
        json->>'idaerolinea' as airline,
        json->>'estes' as status,
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
      WHERE json->>'mov' = 'D'
        AND json->>'arpt' = ANY(${VALID_AIRPORTS})
        AND json->>'IATAdestorig' = ANY(${VALID_AIRPORTS})
        AND json->>'x_date' >= ${start.format('YYYY-MM-DD')}
        AND json->>'x_date' <= ${end.format('YYYY-MM-DD')}
    )
    SELECT
      origin,
      destination,
      COUNT(*) as total_flights,
      COUNT(CASE WHEN airline = 'FO' THEN 1 END) as flybondi_flights,
      COUNT(CASE WHEN airline != 'FO' THEN 1 END) as others_flights,
      COUNT(CASE WHEN airline = 'FO' AND atda IS NOT NULL THEN 1 END) as flybondi_departed,
      COUNT(CASE WHEN airline != 'FO' AND atda IS NOT NULL THEN 1 END) as others_departed,
      AVG(CASE WHEN airline = 'FO' AND atda IS NOT NULL THEN EXTRACT(EPOCH FROM (atda - stda)) END) as flybondi_avg_delay,
      AVG(CASE WHEN airline != 'FO' AND atda IS NOT NULL THEN EXTRACT(EPOCH FROM (atda - stda)) END) as others_avg_delay,
      COUNT(CASE WHEN airline = 'FO' AND atda IS NOT NULL AND EXTRACT(EPOCH FROM (atda - stda)) >= 1800 THEN 1 END)::float 
        / NULLIF(COUNT(CASE WHEN airline = 'FO' AND atda IS NOT NULL THEN 1 END), 0) * 100 as flybondi_delay_rate,
      COUNT(CASE WHEN airline != 'FO' AND atda IS NOT NULL AND EXTRACT(EPOCH FROM (atda - stda)) >= 1800 THEN 1 END)::float 
        / NULLIF(COUNT(CASE WHEN airline != 'FO' AND atda IS NOT NULL THEN 1 END), 0) * 100 as others_delay_rate
    FROM flight_data
    WHERE stda >= ${start.toDate()} 
      AND stda <= ${end.toDate()}
    GROUP BY origin, destination
    HAVING COUNT(CASE WHEN airline = 'FO' AND atda IS NOT NULL THEN 1 END) > 0
    ORDER BY COUNT(*) DESC;
  `;

	setHeaders({
		'cache-control': 'public, max-age=3600'
	});

	return {
		routes,
		dateRange: {
			start: start.toDate(),
			end: end.toDate()
		}
	};
};
