import type { RequestHandler } from './$types';
import { sql, type Vuelo } from '$lib';

export const GET: RequestHandler = async ({ url }) => {
	const stream = new ReadableStream({
		async start(controller) {
			controller.enqueue('[');
			let first = true;
			await sql<Vuelo[]>`
        WITH flight_data AS (
          SELECT *,
            (to_timestamp(json->>'stda' || ' ' || to_char(last_updated, 'YYYY'), 'DD/MM HH24:MI YYYY') AT TIME ZONE 'UTC' AT TIME ZONE 'America/Buenos_Aires') AS stda,
            CASE 
              WHEN LENGTH(json->>'atda') > 0 THEN (to_timestamp(json->>'atda' || ' ' || to_char(last_updated, 'YYYY'), 'DD/MM HH24:MI YYYY') AT TIME ZONE 'UTC' AT TIME ZONE 'America/Buenos_Aires')
            END AS atda
          FROM aerolineas_latest_flight_status
          left join airfleets_matriculas
          on matricula = json->>'matricula'
        )
        SELECT
          *, CAST(EXTRACT(EPOCH FROM (atda - stda)) AS real) as delta
        FROM flight_data;
        `.cursor(5000, async (rows) => {
				if (!first) {
					controller.enqueue(',');
				}
				const json = JSON.stringify(rows);
				controller.enqueue(json.slice(1, -1));
				first = false;
			});

			controller.enqueue(']');
			controller.close();
		}
	});

	return new Response(stream, {
		headers: {
			'Access-Control-Allow-Origin': '*',
			'Content-Type': 'application/json'
		}
	});
};
