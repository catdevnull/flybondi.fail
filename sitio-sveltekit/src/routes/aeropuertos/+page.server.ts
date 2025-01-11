// TODO ESTE ARCHIVO ESTA GENERADO POR CURSOR COMPOSER (Claude). CAMINAR CON CUIDADO

import type { PageServerLoad } from './$types';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { sql } from '$lib';
import { AEROPUERTOS_FLYBONDI } from '@/aeropuertos-flybondi';

dayjs.extend(utc);
dayjs.extend(timezone);

export const load: PageServerLoad = async () => {
	const tsz = 'America/Argentina/Buenos_Aires';
	const end = dayjs().tz(tsz).subtract(1, 'day').endOf('day');
	const start = end.subtract(30, 'days').startOf('day');

	const condition = sql`json->>'mov' = 'D'`;
	const vuelos = await sql`
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
      WHERE ${condition}
    )
    SELECT
      json->>'arpt' as airport,
      json->>'idaerolinea' as airline,
      COUNT(*) as total_flights,
      COUNT(CASE WHEN atda IS NOT NULL THEN 1 END) as departed_flights,
      COUNT(CASE WHEN json->>'estes' = 'Cancelado' THEN 1 END) as cancelled_flights,
      AVG(CASE WHEN atda IS NOT NULL THEN EXTRACT(EPOCH FROM (atda - stda)) END) as avg_delay,
      json->>'IATAdestorig' as destination,
      COUNT(CASE WHEN atda IS NOT NULL AND EXTRACT(EPOCH FROM (atda - stda)) >= 1800 THEN 1 END) as delayed_flights
    FROM flight_data
    WHERE stda >= ${start.toDate()} 
    AND stda <= ${end.toDate()}
    AND json->>'arpt' = ANY(${AEROPUERTOS_FLYBONDI})
    AND json->>'IATAdestorig' = ANY(${AEROPUERTOS_FLYBONDI})
    GROUP BY json->>'arpt', json->>'idaerolinea', json->>'IATAdestorig'
    ORDER BY json->>'arpt', avg_delay DESC NULLS LAST;
  `;

	// Process the data to group by airport
	const airportStats = vuelos.reduce(
		(acc, flight) => {
			const airport = flight.airport;
			if (!acc[airport]) {
				acc[airport] = {
					iata: airport,
					total_flights: 0,
					departed_flights: 0,
					cancelled_flights: 0,
					delayed_flights: 0,
					total_delay: 0,
					airlines: {},
					destinations: new Set(),
					withoutFlybondi: {
						total_flights: 0,
						departed_flights: 0,
						cancelled_flights: 0,
						delayed_flights: 0,
						total_delay: 0
					}
				};
			}

			acc[airport].total_flights += Number(flight.total_flights);
			acc[airport].departed_flights += Number(flight.departed_flights);
			acc[airport].cancelled_flights += Number(flight.cancelled_flights);
			acc[airport].delayed_flights += Number(flight.delayed_flights);
			acc[airport].total_delay += Number(flight.avg_delay || 0) * Number(flight.departed_flights);
			acc[airport].destinations.add(flight.destination);

			if (flight.airline !== 'FO') {
				acc[airport].withoutFlybondi.total_flights += Number(flight.total_flights);
				acc[airport].withoutFlybondi.departed_flights += Number(flight.departed_flights);
				acc[airport].withoutFlybondi.cancelled_flights += Number(flight.cancelled_flights);
				acc[airport].withoutFlybondi.delayed_flights += Number(flight.delayed_flights);
				acc[airport].withoutFlybondi.total_delay +=
					Number(flight.avg_delay || 0) * Number(flight.departed_flights);
			}

			if (!acc[airport].airlines[flight.airline]) {
				acc[airport].airlines[flight.airline] = {
					total_flights: 0,
					departed_flights: 0,
					cancelled_flights: 0,
					delayed_flights: 0,
					avg_delay: 0
				};
			}

			acc[airport].airlines[flight.airline].total_flights += Number(flight.total_flights);
			acc[airport].airlines[flight.airline].departed_flights += Number(flight.departed_flights);
			acc[airport].airlines[flight.airline].cancelled_flights += Number(flight.cancelled_flights);
			acc[airport].airlines[flight.airline].delayed_flights += Number(flight.delayed_flights);
			acc[airport].airlines[flight.airline].avg_delay =
				(acc[airport].airlines[flight.airline].avg_delay *
					(acc[airport].airlines[flight.airline].departed_flights -
						Number(flight.departed_flights)) +
					Number(flight.avg_delay || 0) * Number(flight.departed_flights)) /
				acc[airport].airlines[flight.airline].departed_flights;

			return acc;
		},
		{} as Record<string, any>
	);

	// Calculate averages and convert to array
	const airportsData = Object.values(airportStats).map((airport: any) => {
		airport.avg_delay = airport.total_delay / airport.departed_flights;
		if (airport.withoutFlybondi.departed_flights > 0) {
			airport.withoutFlybondi.avg_delay =
				airport.withoutFlybondi.total_delay / airport.withoutFlybondi.departed_flights;
		}
		airport.destinations = Array.from(airport.destinations);
		airport.delay_improvement = airport.withoutFlybondi.avg_delay - airport.avg_delay;
		airport.cancellation_rate = (airport.cancelled_flights / airport.total_flights) * 100;
		airport.cancellation_rate_without_flybondi =
			(airport.withoutFlybondi.cancelled_flights / airport.withoutFlybondi.total_flights) * 100;
		airport.delay_rate = (airport.delayed_flights / airport.departed_flights) * 100;
		airport.delay_rate_without_flybondi =
			(airport.withoutFlybondi.delayed_flights / airport.withoutFlybondi.departed_flights) * 100;
		return airport;
	});

	return {
		airports: airportsData,
		dateRange: {
			start: start.toDate(),
			end: end.toDate()
		}
	};
};
