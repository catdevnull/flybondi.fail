import type { PageServerLoad } from './$types';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { sql } from '$lib';
import { AEROPUERTOS_FLYBONDI } from '@/aeropuertos-flybondi';
import { MIN_LEADERBOARD_FLIGHTS } from './config';

dayjs.extend(utc);
dayjs.extend(timezone);

const TIMEZONE = 'America/Argentina/Buenos_Aires';
const DEFAULT_WINDOW_DAYS = 180;

export const load = (async ({ url, setHeaders }) => {
	const endDateParam = url.searchParams.get('end');
	const startDateParam = url.searchParams.get('start');

	const defaultEnd = dayjs().tz(TIMEZONE).subtract(1, 'day').endOf('day');
	const endDate = endDateParam
		? dayjs(endDateParam).tz(TIMEZONE).endOf('day')
		: defaultEnd;

	const defaultStart = defaultEnd.clone().subtract(DEFAULT_WINDOW_DAYS - 1, 'day').startOf('day');
	const startDate = startDateParam
		? dayjs(startDateParam).tz(TIMEZONE).startOf('day')
		: defaultStart;

	const leaderboard = await sql`
    WITH flight_data AS (
      SELECT 
        json->>'idaerolinea' AS airline,
        json->>'estes' AS status,
        json->>'arpt' AS origin,
        json->>'IATAdestorig' AS destination,
        (to_timestamp(
          json->>'stda' || ' ' || 
          CASE 
            WHEN json->>'stda' LIKE '31/12%' AND split_part(json->>'x_date', '-', 2) = '01'
            THEN (split_part(json->>'x_date', '-', 1)::int - 1)::text
            ELSE split_part(json->>'x_date', '-', 1)
          END,
          'DD/MM HH24:MI YYYY'
        )::timestamp without time zone AT TIME ZONE ${TIMEZONE}) AS stda,
        CASE
          WHEN LENGTH(json->>'atda') > 0 THEN (
            to_timestamp(json->>'atda' || ' ' || split_part(json->>'x_date', '-', 1), 'DD/MM HH24:MI YYYY')::timestamp without time zone AT TIME ZONE ${TIMEZONE}
          )
        END AS atda
      FROM aerolineas_latest_flight_status
      WHERE json->>'mov' = 'D'
    )
    SELECT
      airline,
      CAST(COUNT(*) AS INTEGER) AS total_flights,
      CAST(SUM(CASE WHEN status = 'Cancelado' THEN 1 ELSE 0 END) AS INTEGER) AS cancelled_flights,
      CAST(SUM(CASE WHEN atda IS NOT NULL THEN 1 ELSE 0 END) AS INTEGER) AS completed_flights,
      ROUND(CAST(AVG(CASE WHEN atda IS NOT NULL THEN EXTRACT(EPOCH FROM (atda - stda))/60 END) AS NUMERIC), 1) AS avg_delay_minutes,
      CAST(SUM(CASE WHEN atda IS NOT NULL AND EXTRACT(EPOCH FROM (atda - stda))/60 <= 15 THEN 1 ELSE 0 END) AS INTEGER) AS on_time_flights,
      CASE 
        WHEN SUM(CASE WHEN atda IS NOT NULL THEN 1 ELSE 0 END) > 0 
        THEN ROUND(
          (SUM(CASE WHEN atda IS NOT NULL AND EXTRACT(EPOCH FROM (atda - stda))/60 <= 15 THEN 1 ELSE 0 END)::numeric * 100)
          / SUM(CASE WHEN atda IS NOT NULL THEN 1 ELSE 0 END),
          1
        )
        ELSE NULL
      END AS on_time_percentage,
      CAST(SUM(CASE WHEN atda IS NOT NULL AND EXTRACT(EPOCH FROM (atda - stda))/60 > 60 THEN 1 ELSE 0 END) AS INTEGER) AS very_delayed_flights,
      CASE 
        WHEN COUNT(*) > 0 THEN ROUND((SUM(CASE WHEN status = 'Cancelado' THEN 1 ELSE 0 END)::numeric * 100) / COUNT(*), 1)
        ELSE NULL
      END AS cancel_percentage
    FROM flight_data
    WHERE stda >= ${startDate.toDate()} AND stda <= ${endDate.toDate()}
      AND origin = ANY(${AEROPUERTOS_FLYBONDI})
      AND destination = ANY(${AEROPUERTOS_FLYBONDI})
    GROUP BY airline
    HAVING COUNT(*) > ${MIN_LEADERBOARD_FLIGHTS}
    ORDER BY avg_delay_minutes DESC NULLS LAST, cancel_percentage DESC NULLS LAST;
  `;

	setHeaders({
		'cache-control': 'public, max-age=300'
	});

	return {
		leaderboard,
		period: {
			start: startDate.toISOString(),
			end: endDate.toISOString()
		},
		hasCustomDate: Boolean(startDateParam || endDateParam)
	};
}) satisfies PageServerLoad;
