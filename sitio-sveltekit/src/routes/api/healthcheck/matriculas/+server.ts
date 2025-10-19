import type { RequestHandler } from './$types';
import { sql } from '$lib';

export const GET: RequestHandler = async () => {
	const [row] = await sql<{ missing_count: string }[]>`
    SELECT COUNT(DISTINCT json->>'matricula') as missing_count
    FROM aerolineas_latest_flight_status
    WHERE json->>'matricula' NOT IN (
      SELECT matricula FROM airfleets_matriculas
    )
  `;

	const missingCount = parseInt(row?.missing_count ?? '0', 10);

	if (missingCount > 10) {
		return new Response(`too many missing matriculas: ${missingCount}`, { status: 500 });
	}

	return new Response(`ok (${missingCount} missing)`);
};
