import type { PageServerLoad } from './$types';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { sql } from '$lib';
import { AEROPUERTOS_FLYBONDI } from '@/aeropuertos-flybondi';

dayjs.extend(utc);
dayjs.extend(timezone);

const TIMEZONE = 'America/Argentina/Buenos_Aires';

export const load = (async ({ setHeaders }) => {
	const startDate = dayjs('2025-01-01').tz(TIMEZONE).startOf('day');
	const endDate = dayjs('2025-12-31').tz(TIMEZONE).endOf('day');

	const MAX_DELAY_MINUTES = 1440; // Cap at 24 hours to exclude parsing errors
	const MIN_DELAY_MINUTES = -60; // Cap at 1 hour early to exclude parsing errors

	const [flybondiStats, worstAirports, worstRoutes, monthlyStats] = await Promise.all([
		sql`
    WITH flight_data AS (
      SELECT 
        json->>'idaerolinea' AS airline,
        json->>'estes' AS status,
        json->>'arpt' AS origin,
        json->>'IATAdestorig' AS destination,
        (stda_parsed AT TIME ZONE ${TIMEZONE}) AS stda,
        CASE
          WHEN LENGTH(json->>'atda') > 0 THEN (
            to_timestamp(json->>'atda' || ' ' || split_part(json->>'x_date', '-', 1), 'DD/MM HH24:MI YYYY')::timestamp without time zone AT TIME ZONE ${TIMEZONE}
          )
        END AS atda
      FROM aerolineas_latest_flight_status
      WHERE json->>'mov' = 'D'
        AND json->>'idaerolinea' = 'FO'
        AND stda_parsed >= ${startDate.toDate()}
        AND stda_parsed <= ${endDate.toDate()}
    ),
    capped AS (
      SELECT *,
        CASE 
          WHEN atda IS NOT NULL 
            AND EXTRACT(EPOCH FROM (atda - stda))/60 <= ${MAX_DELAY_MINUTES}
            AND EXTRACT(EPOCH FROM (atda - stda))/60 >= ${MIN_DELAY_MINUTES}
          THEN EXTRACT(EPOCH FROM (atda - stda))/60 
        END AS delay_mins
      FROM flight_data
    )
    SELECT
      CAST(COUNT(*) AS INTEGER) AS total_flights,
      CAST(SUM(CASE WHEN status = 'Cancelado' THEN 1 ELSE 0 END) AS INTEGER) AS cancelled_flights,
      CAST(SUM(CASE WHEN atda IS NOT NULL THEN 1 ELSE 0 END) AS INTEGER) AS completed_flights,
      ROUND(CAST(AVG(delay_mins) AS NUMERIC), 1) AS avg_delay_minutes,
      CAST(SUM(CASE WHEN delay_mins > 15 THEN 1 ELSE 0 END) AS INTEGER) AS delayed_15_flights,
      CAST(SUM(CASE WHEN delay_mins > 30 THEN 1 ELSE 0 END) AS INTEGER) AS delayed_30_flights,
      CAST(SUM(CASE WHEN delay_mins > 60 THEN 1 ELSE 0 END) AS INTEGER) AS delayed_60_flights,
      CAST(SUM(CASE WHEN delay_mins > 120 THEN 1 ELSE 0 END) AS INTEGER) AS delayed_120_flights,
      ROUND(CAST(MAX(delay_mins) AS NUMERIC), 0) AS max_delay_minutes,
      ROUND(CAST(SUM(CASE WHEN delay_mins > 0 THEN delay_mins END) AS NUMERIC), 0) AS total_delay_minutes
    FROM capped;
  `,
		sql`
    WITH flight_data AS (
      SELECT 
        json->>'idaerolinea' AS airline,
        json->>'estes' AS status,
        json->>'arpt' AS origin,
        json->>'IATAdestorig' AS destination,
        (stda_parsed AT TIME ZONE ${TIMEZONE}) AS stda,
        CASE
          WHEN LENGTH(json->>'atda') > 0 THEN (
            to_timestamp(json->>'atda' || ' ' || split_part(json->>'x_date', '-', 1), 'DD/MM HH24:MI YYYY')::timestamp without time zone AT TIME ZONE ${TIMEZONE}
          )
        END AS atda
      FROM aerolineas_latest_flight_status
      WHERE json->>'mov' = 'D'
        AND json->>'idaerolinea' = 'FO'
        AND stda_parsed >= ${startDate.toDate()}
        AND stda_parsed <= ${endDate.toDate()}
        AND (json->>'arpt') = ANY(${AEROPUERTOS_FLYBONDI})
        AND (json->>'IATAdestorig') = ANY(${AEROPUERTOS_FLYBONDI})
    ),
    capped AS (
      SELECT *,
        CASE 
          WHEN atda IS NOT NULL 
            AND EXTRACT(EPOCH FROM (atda - stda))/60 <= ${MAX_DELAY_MINUTES}
            AND EXTRACT(EPOCH FROM (atda - stda))/60 >= ${MIN_DELAY_MINUTES}
          THEN EXTRACT(EPOCH FROM (atda - stda))/60 
        END AS delay_mins
      FROM flight_data
    )
    SELECT
      origin AS airport,
      CAST(COUNT(*) AS INTEGER) AS total_flights,
      CAST(SUM(CASE WHEN status = 'Cancelado' THEN 1 ELSE 0 END) AS INTEGER) AS cancelled_flights,
      ROUND(CAST(AVG(delay_mins) AS NUMERIC), 1) AS avg_delay_minutes,
      ROUND((SUM(CASE WHEN status = 'Cancelado' THEN 1 ELSE 0 END)::numeric * 100) / COUNT(*), 1) AS cancel_percentage
    FROM capped
    GROUP BY origin
    HAVING COUNT(*) >= 50
    ORDER BY avg_delay_minutes DESC NULLS LAST
    LIMIT 5;
  `,
		sql`
    WITH flight_data AS (
      SELECT 
        json->>'idaerolinea' AS airline,
        json->>'estes' AS status,
        json->>'arpt' AS origin,
        json->>'IATAdestorig' AS destination,
        (stda_parsed AT TIME ZONE ${TIMEZONE}) AS stda,
        CASE
          WHEN LENGTH(json->>'atda') > 0 THEN (
            to_timestamp(json->>'atda' || ' ' || split_part(json->>'x_date', '-', 1), 'DD/MM HH24:MI YYYY')::timestamp without time zone AT TIME ZONE ${TIMEZONE}
          )
        END AS atda
      FROM aerolineas_latest_flight_status
      WHERE json->>'mov' = 'D'
        AND json->>'idaerolinea' = 'FO'
        AND stda_parsed >= ${startDate.toDate()}
        AND stda_parsed <= ${endDate.toDate()}
        AND (json->>'arpt') = ANY(${AEROPUERTOS_FLYBONDI})
        AND (json->>'IATAdestorig') = ANY(${AEROPUERTOS_FLYBONDI})
    ),
    capped AS (
      SELECT *,
        CASE 
          WHEN atda IS NOT NULL 
            AND EXTRACT(EPOCH FROM (atda - stda))/60 <= ${MAX_DELAY_MINUTES}
            AND EXTRACT(EPOCH FROM (atda - stda))/60 >= ${MIN_DELAY_MINUTES}
          THEN EXTRACT(EPOCH FROM (atda - stda))/60 
        END AS delay_mins
      FROM flight_data
    )
    SELECT
      origin || ' → ' || destination AS route,
      CAST(COUNT(*) AS INTEGER) AS total_flights,
      CAST(SUM(CASE WHEN status = 'Cancelado' THEN 1 ELSE 0 END) AS INTEGER) AS cancelled_flights,
      ROUND(CAST(AVG(delay_mins) AS NUMERIC), 1) AS avg_delay_minutes,
      ROUND((SUM(CASE WHEN status = 'Cancelado' THEN 1 ELSE 0 END)::numeric * 100) / COUNT(*), 1) AS cancel_percentage
    FROM capped
    GROUP BY origin, destination
    HAVING COUNT(*) >= 30
    ORDER BY avg_delay_minutes DESC NULLS LAST
    LIMIT 5;
  `,
		sql`
    WITH flight_data AS (
      SELECT 
        json->>'idaerolinea' AS airline,
        json->>'estes' AS status,
        json->>'arpt' AS origin,
        json->>'IATAdestorig' AS destination,
        (stda_parsed AT TIME ZONE ${TIMEZONE}) AS stda,
        CASE
          WHEN LENGTH(json->>'atda') > 0 THEN (
            to_timestamp(json->>'atda' || ' ' || split_part(json->>'x_date', '-', 1), 'DD/MM HH24:MI YYYY')::timestamp without time zone AT TIME ZONE ${TIMEZONE}
          )
        END AS atda
      FROM aerolineas_latest_flight_status
      WHERE json->>'mov' = 'D'
        AND json->>'idaerolinea' = 'FO'
        AND stda_parsed >= ${startDate.toDate()}
        AND stda_parsed <= ${endDate.toDate()}
        AND (json->>'arpt') = ANY(${AEROPUERTOS_FLYBONDI})
        AND (json->>'IATAdestorig') = ANY(${AEROPUERTOS_FLYBONDI})
    ),
    capped AS (
      SELECT *,
        CASE 
          WHEN atda IS NOT NULL 
            AND EXTRACT(EPOCH FROM (atda - stda))/60 <= ${MAX_DELAY_MINUTES}
            AND EXTRACT(EPOCH FROM (atda - stda))/60 >= ${MIN_DELAY_MINUTES}
          THEN EXTRACT(EPOCH FROM (atda - stda))/60 
        END AS delay_mins
      FROM flight_data
    )
    SELECT
      TO_CHAR(stda, 'YYYY-MM') AS month,
      CAST(COUNT(*) AS INTEGER) AS total_flights,
      CAST(SUM(CASE WHEN status = 'Cancelado' THEN 1 ELSE 0 END) AS INTEGER) AS cancelled_flights,
      ROUND(CAST(AVG(delay_mins) AS NUMERIC), 1) AS avg_delay_minutes
    FROM capped
    GROUP BY TO_CHAR(stda, 'YYYY-MM')
    ORDER BY month;
  `
	]);

	const worstMonth = monthlyStats.length > 0 
		? monthlyStats.reduce((worst, current) => 
			(current.avg_delay_minutes || 0) > (worst.avg_delay_minutes || 0) ? current : worst
		)
		: null;

	const mostCancelledMonth = monthlyStats.length > 0
		? monthlyStats.reduce((worst, current) => 
			(current.cancelled_flights || 0) > (worst.cancelled_flights || 0) ? current : worst
		)
		: null;

	setHeaders({
		'cache-control': 'public, max-age=3600'
	});

	return {
		stats: flybondiStats[0] || {
			total_flights: 0,
			cancelled_flights: 0,
			completed_flights: 0,
			avg_delay_minutes: 0,
			delayed_15_flights: 0,
			delayed_30_flights: 0,
			delayed_60_flights: 0,
			delayed_120_flights: 0,
			max_delay_minutes: 0,
			total_delay_minutes: 0
		},
		worstAirports,
		worstRoutes,
		monthlyStats,
		worstMonth,
		mostCancelledMonth,
		year: 2025
	};
}) satisfies PageServerLoad;
