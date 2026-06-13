import type { PageServerLoad } from './$types';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { sql } from '$lib';
import { getAvailableFlightDates, getDepartureFlightsBetween } from '$lib/server/flight-data';

dayjs.extend(utc);
dayjs.extend(timezone);

export const load: PageServerLoad = async ({ url, params, platform, setHeaders }) => {
	const tsz = 'America/Argentina/Buenos_Aires';
	const date = dayjs(params.date).tz(tsz, true);

	const start = date.startOf('day');
	const end = date.endOf('day');

	const tomorrowStart = start.add(1, 'day');
	const tomorrowEnd = end.add(3, 'day');

	const [availableDates, vuelos, tomorrowData] = await Promise.all([
		getAvailableFlightDates(),
		getDepartureFlightsBetween(start.toDate(), end.toDate()),
		sql<{ exists: boolean }[]>`
			SELECT EXISTS (
				SELECT 1
				FROM aerolineas_latest_flight_status
				WHERE json->>'mov' = 'D'
					AND stda_parsed >= ${tomorrowStart.toDate()}
					AND stda_parsed <= ${tomorrowEnd.toDate()}
			);
		`
	]);

	setHeaders({
		'cache-control': 'public, max-age=60'
	});

	return {
		vuelos,
		date: date.toDate(),
		hasYesterdayData: start.subtract(1, 'day').isAfter('2024-12-21', 'day'),
		hasTomorrowData: tomorrowData[0]?.exists ?? false,
		hasCustomDate: url.searchParams.has('date'),
		aerolineaEnUrl: url.searchParams.get('aerolinea'),
		availableDates
	};
};
