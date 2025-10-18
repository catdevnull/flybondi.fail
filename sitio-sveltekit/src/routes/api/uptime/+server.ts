import type { RequestHandler } from './$types';
import { sql } from '$lib';

export const GET: RequestHandler = async () => {
	const [row] = await sql<{ has_recent_data: boolean }[]>`
    SELECT EXISTS (
      SELECT 1
      FROM aerolineas_latest_flight_status
      WHERE last_updated >= NOW() - INTERVAL '24 hours'
    ) AS has_recent_data
  `;

	if (!row?.has_recent_data) {
		return new Response('no recent data', { status: 500 });
	}

	return new Response('ok');
};

