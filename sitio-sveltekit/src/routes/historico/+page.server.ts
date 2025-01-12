import type { PageServerLoad } from './$types';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { sql } from '$lib';
import { AEROPUERTOS_FLYBONDI } from '@/aeropuertos-flybondi';

dayjs.extend(utc);
dayjs.extend(timezone);

export const load = (async ({ url, setHeaders }) => {
	const tsz = 'America/Argentina/Buenos_Aires';
	const defaultStartDate = dayjs().tz(tsz).subtract(30, 'days').startOf('day').toDate();
	const defaultEndDate = dayjs().tz(tsz).subtract(1, 'day').endOf('day').toDate();

	const startDate = url.searchParams.has('start')
		? dayjs(url.searchParams.get('start')).tz(tsz).startOf('day').toDate()
		: defaultStartDate;

	const endDate = url.searchParams.has('end')
		? dayjs(url.searchParams.get('end')).tz(tsz).endOf('day').toDate()
		: defaultEndDate;

	const dailyStats = await sql`
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
        )::timestamp without time zone AT TIME ZONE 'America/Buenos_Aires') AS stda,
        CASE 
          WHEN LENGTH(json->>'atda') > 0 THEN (to_timestamp(json->>'atda' || ' ' || split_part(json->>'x_date', '-', 1), 'DD/MM HH24:MI YYYY')::timestamp without time zone AT TIME ZONE 'America/Buenos_Aires')
        END AS atda
      FROM aerolineas_latest_flight_status
      WHERE json->>'mov' = 'D'
    )
    SELECT 
      DATE(stda) as date,
      json->>'idaerolinea' as airline,
      AVG(CASE WHEN atda IS NOT NULL THEN EXTRACT(EPOCH FROM (atda - stda))/60 END) as "avgDelay",
      (COUNT(CASE WHEN json->>'estes' = 'Cancelado' THEN 1 END) * 100.0 / COUNT(*)) as "cancelPercentage",
      COUNT(*) as total_flights
    FROM flight_data
    WHERE stda >= ${startDate} 
    AND stda <= ${endDate}
    AND json->>'arpt' = ANY(${AEROPUERTOS_FLYBONDI})
    AND json->>'IATAdestorig' = ANY(${AEROPUERTOS_FLYBONDI})
    GROUP BY DATE(stda), json->>'idaerolinea'
    HAVING COUNT(*) >= 10
    ORDER BY date ASC;
  `;

	const availableDates = await sql`
    WITH flight_data AS (
      SELECT DISTINCT DATE(
        (to_timestamp(
          json->>'stda' || ' ' || 
          CASE 
            WHEN json->>'stda' LIKE '31/12%' AND split_part(json->>'x_date', '-', 2) = '01' 
            THEN (split_part(json->>'x_date', '-', 1)::int - 1)::text
            ELSE split_part(json->>'x_date', '-', 1)
          END,
          'DD/MM HH24:MI YYYY'
        )::timestamp without time zone AT TIME ZONE 'America/Buenos_Aires')
      ) as date,
      json->>'idaerolinea' as airline,
      COUNT(*) as total_flights
      FROM aerolineas_latest_flight_status
      WHERE json->>'mov' = 'D'
      AND json->>'arpt' = ANY(${AEROPUERTOS_FLYBONDI})
      AND json->>'IATAdestorig' = ANY(${AEROPUERTOS_FLYBONDI})
      GROUP BY DATE(
        (to_timestamp(
          json->>'stda' || ' ' || 
          CASE 
            WHEN json->>'stda' LIKE '31/12%' AND split_part(json->>'x_date', '-', 2) = '01' 
            THEN (split_part(json->>'x_date', '-', 1)::int - 1)::text
            ELSE split_part(json->>'x_date', '-', 1)
          END,
          'DD/MM HH24:MI YYYY'
        )::timestamp without time zone AT TIME ZONE 'America/Buenos_Aires')
      ), json->>'idaerolinea'
      HAVING COUNT(*) >= 10
    ) 
    SELECT DISTINCT date::text FROM flight_data
    ORDER BY date ASC;
  `;

	setHeaders({
		'cache-control': 'public, max-age=60'
	});

	return {
		dailyStats,
		hasCustomDate: url.searchParams.has('start') || url.searchParams.has('end'),
		availableDates: availableDates.map((o) => o.date)
	};
}) satisfies PageServerLoad;
