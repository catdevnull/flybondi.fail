import type { PageServerLoad } from './$types';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { redirect } from '@sveltejs/kit';
import { sql } from '$lib';
import { getAvailableFlightDates, getDepartureFlightsBetween } from '$lib/server/flight-data';

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

function normalizeDateParam(dateParam: string | null, tsz: string) {
	if (dateParam) return dayjs(dateParam).tz(tsz, true).format('YYYY-MM-DD');
	return dayjs().tz(tsz).subtract(1, 'day').format('YYYY-MM-DD');
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

	const [weeklyRows, todayFlights, recentAvailableDates] = await Promise.all([
		sql<WeeklyRow[]>`
		WITH flight_data AS (
			SELECT
				DATE(stda_parsed AT TIME ZONE 'America/Argentina/Buenos_Aires') AS flight_date,
				date_trunc('week', stda_parsed AT TIME ZONE 'America/Argentina/Buenos_Aires')::date AS week_start,
				NULLIF(json->>'matricula', '') AS matricula,
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
	`,
		getDepartureFlightsBetween(todayStart.toDate(), todayEnd.toDate()),
		getAvailableFlightDates()
	]);

	setHeaders({
		'cache-control': 'public, max-age=300'
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
		todayFlights: todayFlights.map((flight) => ({
			...flight,
			delta: Number(flight.delta ?? 0)
		})),
		recentAvailableDates: recentAvailableDates
			.slice(0, 10)
			.map((date) =>
				date instanceof Date
					? dayjs(date).tz(tsz).format('YYYY-MM-DD')
					: dayjs(date).tz(tsz, true).format('YYYY-MM-DD')
			),
		todayDate: today.format('YYYY-MM-DD'),
		todayFlightsUrl: `/date/${today.format('YYYY-MM-DD')}`
	};
}) satisfies PageServerLoad;
