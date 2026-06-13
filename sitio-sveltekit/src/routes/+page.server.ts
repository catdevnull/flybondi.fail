import type { PageServerLoad } from './$types';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { redirect } from '@sveltejs/kit';
import { sql } from '$lib';
import { getRecentAvailableFlightDates } from '$lib/server/flight-data';
import { createTimings } from '$lib/server/timing';
import { AEROPUERTOS_FLYBONDI } from '$lib/aeropuertos-flybondi';
import { IATA_NAMES } from '$lib/aerolineas';

dayjs.extend(utc);
dayjs.extend(timezone);

type WeeklyRow = {
	week_start: string;
	total_flights: number | string;
	cancelled_flights: number | string;
	avg_aircraft_per_day: number | string;
	max_aircraft_per_day: number | string;
	flying_days: number | string;
};

type HomeTodayFlight = {
	json: {
		nro: string;
		estes?: string;
	};
	delta: number;
	atda: Date | string | null;
};

type HomeAirlineData = {
	name: string;
	avgDelay: number;
	nVuelos: number;
	otherAerolineas?: string[];
};

type HomeTodayChartsRow = {
	flights: HomeTodayFlight[];
	airline_data: {
		airline_group: 'FO' | 'AR' | 'OTHER';
		avg_delay: number | string;
		n_vuelos: number | string;
		other_aerolineas: string[] | null;
	}[];
};

function normalizeDateParam(dateParam: string | null, tsz: string) {
	if (dateParam) return dayjs(dateParam).tz(tsz, true).format('YYYY-MM-DD');
	return dayjs().tz(tsz).subtract(1, 'day').format('YYYY-MM-DD');
}

function getHomeTodayCharts(start: Date, end: Date) {
	return sql<HomeTodayChartsRow[]>`
		WITH flight_data AS (
			SELECT
				json->>'nro' AS nro,
				json->>'idaerolinea' AS airline,
				json->>'arpt' AS origin,
				json->>'IATAdestorig' AS destination,
				json->>'estes' AS status,
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
			WHERE json->>'mov' = 'D'
				AND stda_parsed >= ${start}
				AND stda_parsed <= ${end}
		),
		flybondi_display AS (
			SELECT
				jsonb_build_object('nro', nro, 'estes', status) AS json,
				COALESCE(delta, 0) AS delta,
				atda,
				CASE WHEN status = 'Cancelado' THEN 0 ELSE 1 END AS sort_status
			FROM flight_data
			WHERE airline = 'FO'
				AND (atda IS NOT NULL OR status = 'Cancelado')
		),
		average_data AS (
			SELECT
				CASE
					WHEN airline = 'FO' THEN 'FO'
					WHEN airline = 'AR' THEN 'AR'
					ELSE 'OTHER'
				END AS airline_group,
				AVG(delta) / 60 AS avg_delay,
				COUNT(*) AS n_vuelos,
				ARRAY_AGG(DISTINCT airline) FILTER (WHERE airline NOT IN ('FO', 'AR')) AS other_aerolineas
			FROM flight_data
			WHERE atda IS NOT NULL
				AND origin = ANY(${AEROPUERTOS_FLYBONDI})
				AND destination = ANY(${AEROPUERTOS_FLYBONDI})
			GROUP BY airline_group
		)
		SELECT
			(SELECT COALESCE(jsonb_agg(jsonb_build_object('json', json, 'delta', delta, 'atda', atda) ORDER BY sort_status, delta DESC NULLS LAST), '[]'::jsonb) FROM flybondi_display) AS flights,
			(SELECT COALESCE(jsonb_agg(to_jsonb(average_data)), '[]'::jsonb) FROM average_data) AS airline_data;
	`;
}

export const load = (async ({ url, setHeaders }) => {
	const tsz = 'America/Argentina/Buenos_Aires';

	if (url.search) {
		const date = normalizeDateParam(url.searchParams.get('date'), tsz);
		const params = new URLSearchParams();
		const aerolinea = url.searchParams.get('aerolinea');
		if (aerolinea) params.set('aerolinea', aerolinea);
		const query = params.toString();
		redirect(308, `/date/${date}${query ? `?${query}` : ''}`);
	}

	const endDate = dayjs().tz(tsz).startOf('week').subtract(1, 'millisecond');
	const today = dayjs().tz(tsz);
	const todayStart = today.startOf('day');
	const todayEnd = today.endOf('day');
	const timings = createTimings();

	const [weeklyRows, todayChartsRows, recentAvailableDates] = await Promise.all([
		timings.timed(
			'home.weekly',
			sql<WeeklyRow[]>`
		WITH flight_data AS (
			SELECT
				DATE(stda_parsed AT TIME ZONE 'America/Argentina/Buenos_Aires') AS flight_date,
				date_trunc('week', stda_parsed AT TIME ZONE 'America/Argentina/Buenos_Aires')::date AS week_start,
				NULLIF(matricula, '') AS matricula,
				json->>'estes' AS status
			FROM aerolineas_latest_flight_status
			WHERE json->>'mov' = 'D'
				AND json->>'idaerolinea' = 'FO'
				AND stda_parsed <= ${endDate.toDate()}
		),
		daily_aircraft AS (
			SELECT
				week_start,
				flight_date,
				COUNT(DISTINCT matricula) AS aircraft_count
			FROM flight_data
			WHERE matricula IS NOT NULL
			GROUP BY week_start, flight_date
		),
		weekly_flights AS (
			SELECT
				week_start,
				COUNT(*) AS total_flights,
				COUNT(*) FILTER (WHERE status = 'Cancelado') AS cancelled_flights
			FROM flight_data
			GROUP BY week_start
		),
		weekly_aircraft AS (
			SELECT
				week_start,
				ROUND(AVG(aircraft_count)::numeric, 1) AS avg_aircraft_per_day,
				MAX(aircraft_count) AS max_aircraft_per_day,
				COUNT(*) AS flying_days
			FROM daily_aircraft
			GROUP BY week_start
		)
		SELECT
			w.week_start::text,
			w.total_flights,
			w.cancelled_flights,
			COALESCE(a.avg_aircraft_per_day, 0) AS avg_aircraft_per_day,
			COALESCE(a.max_aircraft_per_day, 0) AS max_aircraft_per_day,
			COALESCE(a.flying_days, 0) AS flying_days
		FROM weekly_flights w
		LEFT JOIN weekly_aircraft a ON a.week_start = w.week_start
		ORDER BY w.week_start ASC;
	`
		),
		timings.timed('home.todayCharts', getHomeTodayCharts(todayStart.toDate(), todayEnd.toDate())),
		timings.timed('home.recentAvailableDates', getRecentAvailableFlightDates(10))
	]);
	const todayCharts = todayChartsRows[0] ?? { flights: [], airline_data: [] };
	const todayFlights = todayCharts.flights.map((flight) => ({
		...flight,
		delta: Number(flight.delta ?? 0)
	}));
	const todayAirlineData = todayCharts.airline_data
		.map<HomeAirlineData | null>((row) => {
			if (row.airline_group === 'FO') {
				return {
					name: IATA_NAMES.FO,
					avgDelay: Number(row.avg_delay),
					nVuelos: Number(row.n_vuelos)
				};
			}
			if (row.airline_group === 'AR') {
				return {
					name: IATA_NAMES.AR,
					avgDelay: Number(row.avg_delay),
					nVuelos: Number(row.n_vuelos)
				};
			}
			return {
				name: 'Otros',
				avgDelay: Number(row.avg_delay),
				nVuelos: Number(row.n_vuelos),
				otherAerolineas: (row.other_aerolineas ?? []).map(
					(airline) => IATA_NAMES[airline as keyof typeof IATA_NAMES] ?? airline
				)
			};
		})
		.filter((row): row is HomeAirlineData => row !== null && row.nVuelos > 0);

	setHeaders({
		'cache-control': 'public, max-age=300',
		'server-timing': timings.header()
	});

	return {
		weeks: weeklyRows.map((row) => ({
			weekStart: row.week_start,
			totalFlights: Number(row.total_flights),
			cancelledFlights: Number(row.cancelled_flights),
			avgAircraftPerDay: Number(row.avg_aircraft_per_day),
			maxAircraftPerDay: Number(row.max_aircraft_per_day),
			flyingDays: Number(row.flying_days)
		})),
		period: {
			start: weeklyRows[0]?.week_start ?? endDate.format('YYYY-MM-DD'),
			end: endDate.format('YYYY-MM-DD')
		},
		todayFlights,
		todayAirlineData,
		recentAvailableDates: recentAvailableDates.map((date) =>
			date instanceof Date
				? dayjs(date).tz(tsz).format('YYYY-MM-DD')
				: dayjs(date).tz(tsz, true).format('YYYY-MM-DD')
		),
		todayDate: today.format('YYYY-MM-DD'),
		todayFlightsUrl: `/date/${today.format('YYYY-MM-DD')}`
	};
}) satisfies PageServerLoad;
