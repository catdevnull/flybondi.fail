import type { RequestHandler } from './$types';
import { sql, type Vuelo } from '$lib';

export const GET: RequestHandler = async ({ url }) => {
	const vuelos = await sql<Vuelo[]>`
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
    `;

	return new Response(JSON.stringify(vuelos), {
		headers: {
			'Access-Control-Allow-Origin': '*',
			'Content-Type': 'application/json'
		}
	});
};
