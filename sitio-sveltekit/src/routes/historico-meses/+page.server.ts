// TODO ESTE ARCHIVO ESTA GENERADO POR CURSOR COMPOSER (Claude). CAMINAR CON CUIDADO
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
	const defaultStartDate = dayjs().tz(tsz).subtract(12, 'months').startOf('month').toDate();
	const defaultEndDate = dayjs().tz(tsz).subtract(1, 'month').endOf('month').toDate();

	const startDate = url.searchParams.has('start')
		? dayjs(url.searchParams.get('start')).tz(tsz).startOf('month').toDate()
		: defaultStartDate;

	const endDate = url.searchParams.has('end')
		? dayjs(url.searchParams.get('end')).tz(tsz).endOf('month').toDate()
		: defaultEndDate;

	const monthlyStats = await sql`
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
      TO_CHAR(DATE_TRUNC('month', stda), 'YYYY-MM') as date,
      json->>'idaerolinea' as airline,
      ROUND(CAST(AVG(CASE WHEN atda IS NOT NULL THEN EXTRACT(EPOCH FROM (atda - stda))/60 END) AS NUMERIC), 1) as "avgDelay",
      CAST(SUM(CASE WHEN json->>'estes' = 'Cancelado' THEN 1 ELSE 0 END) AS INTEGER) as "cancelledFlights",
      CAST(SUM(CASE WHEN atda IS NOT NULL AND EXTRACT(EPOCH FROM (atda - stda))/60 > 15 THEN 1 ELSE 0 END) AS INTEGER) as "delayed15",
      CAST(SUM(CASE WHEN atda IS NOT NULL AND EXTRACT(EPOCH FROM (atda - stda))/60 > 30 THEN 1 ELSE 0 END) AS INTEGER) as "delayed30",
      ROUND(CAST((COUNT(CASE WHEN json->>'estes' = 'Cancelado' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0)) AS NUMERIC), 1) as "cancelPercentage",
      COUNT(*) as total_flights
    FROM flight_data
    WHERE stda >= ${startDate} 
    AND stda <= ${endDate}
    AND json->>'arpt' = ANY(${AEROPUERTOS_FLYBONDI})
    AND json->>'IATAdestorig' = ANY(${AEROPUERTOS_FLYBONDI})
    GROUP BY DATE_TRUNC('month', stda), json->>'idaerolinea'
    HAVING COUNT(*) >= 50
    ORDER BY date ASC;
  `;

	const availableMonths = await sql`
    WITH flight_data AS (
      SELECT DISTINCT TO_CHAR(DATE_TRUNC('month', 
        (to_timestamp(
          json->>'stda' || ' ' || 
          CASE 
            WHEN json->>'stda' LIKE '31/12%' AND split_part(json->>'x_date', '-', 2) = '01' 
            THEN (split_part(json->>'x_date', '-', 1)::int - 1)::text
            ELSE split_part(json->>'x_date', '-', 1)
          END,
          'DD/MM HH24:MI YYYY'
        )::timestamp without time zone AT TIME ZONE 'America/Buenos_Aires')
      ), 'YYYY-MM') as month,
      json->>'idaerolinea' as airline,
      COUNT(*) as total_flights
      FROM aerolineas_latest_flight_status
      WHERE json->>'mov' = 'D'
      AND json->>'arpt' = ANY(${AEROPUERTOS_FLYBONDI})
      AND json->>'IATAdestorig' = ANY(${AEROPUERTOS_FLYBONDI})
      GROUP BY DATE_TRUNC('month', 
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
      HAVING COUNT(*) >= 50
    ) 
    SELECT DISTINCT month FROM flight_data
    ORDER BY month ASC;
  `;

	setHeaders({
		'cache-control': 'public, max-age=3600'
	});

	return {
		monthlyStats,
		hasCustomDate: url.searchParams.has('start') || url.searchParams.has('end'),
		availableMonths: availableMonths.map((o) => o.month)
	};
}) satisfies PageServerLoad;
