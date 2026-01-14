import type { RequestHandler } from './$types';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { sql } from '$lib';

dayjs.extend(utc);
dayjs.extend(timezone);

const TIMEZONE = 'America/Argentina/Buenos_Aires';

async function loadGoogleFont(family: string, weight: number): Promise<ArrayBuffer> {
	const url = `https://fonts.googleapis.com/css2?family=${family}:wght@${weight}&display=swap`;
	const css = await fetch(url).then((res) => res.text());
	const fontUrl = css.match(/src: url\((.+?)\)/)?.[1];
	if (!fontUrl) throw new Error(`Could not find font URL for ${family}`);
	return fetch(fontUrl).then((res) => res.arrayBuffer());
}

export const GET: RequestHandler = async () => {
	const startDate = dayjs('2025-01-01').tz(TIMEZONE).startOf('day');
	const endDate = dayjs('2025-12-31').tz(TIMEZONE).endOf('day');

	const MAX_DELAY_MINUTES = 1440; // Cap at 24 hours to exclude parsing errors
	const MIN_DELAY_MINUTES = -60; // Cap at 1 hour early to exclude parsing errors

	const [flybondiStats] = await Promise.all([
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
      ROUND(CAST(AVG(delay_mins) AS NUMERIC), 1) AS avg_delay_minutes,
      ROUND(CAST(SUM(CASE WHEN delay_mins > 0 THEN delay_mins END) AS NUMERIC), 0) AS total_delay_minutes
    FROM capped;
  `
	]);

	const stats = flybondiStats[0] || {
		total_flights: 0,
		cancelled_flights: 0,
		avg_delay_minutes: 0,
		total_delay_minutes: 0
	};

	const totalDelayDays = Math.floor((stats.total_delay_minutes || 0) / (60 * 24));
	const cancelledFlights = (stats.cancelled_flights || 0).toLocaleString('es-AR');
	const avgDelayMinutes = Math.round(stats.avg_delay_minutes || 0);

	const interFont = await loadGoogleFont('Inter', 900);

	const circlePatternSvg = `data:image/svg+xml,${encodeURIComponent(`<svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
		<circle cx="100" cy="100" r="90" fill="none" stroke="rgba(0,0,0,0.15)" stroke-width="4"/>
		<circle cx="100" cy="100" r="70" fill="none" stroke="rgba(0,0,0,0.15)" stroke-width="4"/>
		<circle cx="100" cy="100" r="50" fill="none" stroke="rgba(0,0,0,0.15)" stroke-width="4"/>
		<circle cx="100" cy="100" r="30" fill="none" stroke="rgba(0,0,0,0.15)" stroke-width="4"/>
		<circle cx="100" cy="100" r="10" fill="rgba(0,0,0,0.15)"/>
	</svg>`)}`;

	const wavyLinesSvg = `data:image/svg+xml,${encodeURIComponent(`<svg width="400" height="100" viewBox="0 0 400 100" xmlns="http://www.w3.org/2000/svg">
		<path d="M0,50 Q50,20 100,50 T200,50 T300,50 T400,50" stroke="rgba(255,255,255,0.1)" stroke-width="2" fill="none"/>
		<path d="M0,60 Q50,30 100,60 T200,60 T300,60 T400,60" stroke="rgba(255,255,255,0.08)" stroke-width="1.5" fill="none"/>
		<path d="M0,70 Q50,40 100,70 T200,70 T300,70 T400,70" stroke="rgba(255,255,255,0.05)" stroke-width="1" fill="none"/>
	</svg>`)}`;

	const stripesSvg = `data:image/svg+xml,${encodeURIComponent(`<svg width="400" height="100" viewBox="0 0 400 100" xmlns="http://www.w3.org/2000/svg">
		<defs>
			<pattern id="stripes" x="0" y="0" width="20" height="100" patternUnits="userSpaceOnUse">
				<rect width="10" height="100" fill="rgba(255,255,255,0.06)"/>
			</pattern>
		</defs>
		<rect width="100%" height="100%" fill="url(#stripes)"/>
	</svg>`)}`;

	const dotsSvg = `data:image/svg+xml,${encodeURIComponent(`<svg width="400" height="100" viewBox="0 0 400 100" xmlns="http://www.w3.org/2000/svg">
		<defs>
			<pattern id="dots" x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse">
				<circle cx="15" cy="15" r="4" fill="rgba(255,255,255,0.08)"/>
			</pattern>
		</defs>
		<rect width="100%" height="100%" fill="url(#dots)"/>
	</svg>`)}`;

	const svg = await satori(
		{
			type: 'div',
			props: {
				style: {
					display: 'flex',
					flexDirection: 'column',
					width: '100%',
					height: '100%',
					background: '#FDBE11',
					padding: '40px',
					fontFamily: 'Inter',
					position: 'relative',
					overflow: 'hidden'
				},
				children: [
					{
						type: 'img',
						props: {
							src: circlePatternSvg,
							width: 300,
							height: 300,
							style: {
								position: 'absolute',
								top: '-80px',
								right: '-80px',
								opacity: 1
							}
						}
					},
					{
						type: 'img',
						props: {
							src: circlePatternSvg,
							width: 180,
							height: 180,
							style: {
								position: 'absolute',
								bottom: '100px',
								right: '300px',
								opacity: 0.5
							}
						}
					},
					{
						type: 'div',
						props: {
							style: {
								display: 'flex',
								justifyContent: 'space-between',
								alignItems: 'flex-start',
								position: 'relative',
								zIndex: 1
							},
							children: [
								{
									type: 'div',
									props: {
										style: { display: 'flex', flexDirection: 'column' },
										children: [
											{
												type: 'span',
												props: {
													style: { fontSize: '42px', fontWeight: 900, color: '#000' },
													children: 'Failbondi'
												}
											},
											{
												type: 'span',
												props: {
													style: { fontSize: '64px', fontWeight: 900, color: '#000' },
													children: 'Wrapped'
												}
											}
										]
									}
								},
								{
									type: 'span',
									props: {
										style: {
											fontSize: '80px',
											fontWeight: 900,
											color: '#ff4444',
											lineHeight: 1
										},
										children: '2025'
									}
								}
							]
						}
					},
					{
						type: 'div',
						props: {
							style: {
								display: 'flex',
								flex: 1,
								gap: '20px',
								marginTop: '30px',
								justifyContent: 'space-between',
								alignItems: 'stretch'
							},
							children: [
								{
									type: 'div',
									props: {
										style: {
											display: 'flex',
											flexDirection: 'column',
											background: '#1a1a1a',
											borderRadius: '24px',
											padding: '24px',
											flex: 1,
											justifyContent: 'center',
											alignItems: 'center',
											position: 'relative',
											overflow: 'hidden'
										},
										children: [
											{
												type: 'img',
												props: {
													src: wavyLinesSvg,
													width: 400,
													height: 100,
													style: {
														position: 'absolute',
														top: 0,
														left: 0,
														width: '100%',
														opacity: 1
													}
												}
											},
											{
												type: 'span',
												props: {
													style: { fontSize: '72px', fontWeight: 900, color: '#a78bfa', position: 'relative', zIndex: 1 },
													children: String(totalDelayDays)
												}
											},
											{
												type: 'span',
												props: {
													style: { fontSize: '22px', color: '#fff', marginTop: '8px', position: 'relative', zIndex: 1 },
													children: 'días de demoras'
												}
											}
										]
									}
								},
								{
									type: 'div',
									props: {
										style: {
											display: 'flex',
											flexDirection: 'column',
											background: '#1a1a1a',
											borderRadius: '24px',
											padding: '24px',
											flex: 1,
											justifyContent: 'center',
											alignItems: 'center',
											position: 'relative',
											overflow: 'hidden'
										},
										children: [
											{
												type: 'img',
												props: {
													src: stripesSvg,
													width: 400,
													height: 300,
													style: {
														position: 'absolute',
														top: 0,
														left: 0,
														width: '100%',
														height: '100%',
														opacity: 1
													}
												}
											},
											{
												type: 'span',
												props: {
													style: { fontSize: '72px', fontWeight: 900, color: '#FDBE11', position: 'relative', zIndex: 1 },
													children: cancelledFlights
												}
											},
											{
												type: 'span',
												props: {
													style: { fontSize: '22px', color: '#fff', marginTop: '8px', position: 'relative', zIndex: 1 },
													children: 'vuelos cancelados'
												}
											}
										]
									}
								},
								{
									type: 'div',
									props: {
										style: {
											display: 'flex',
											flexDirection: 'column',
											background: '#1a1a1a',
											borderRadius: '24px',
											padding: '24px',
											flex: 1,
											justifyContent: 'center',
											alignItems: 'center',
											position: 'relative',
											overflow: 'hidden'
										},
										children: [
											{
												type: 'img',
												props: {
													src: dotsSvg,
													width: 400,
													height: 300,
													style: {
														position: 'absolute',
														top: 0,
														left: 0,
														width: '100%',
														height: '100%',
														opacity: 1
													}
												}
											},
											{
												type: 'span',
												props: {
													style: { fontSize: '72px', fontWeight: 900, color: '#fbbf24', position: 'relative', zIndex: 1 },
													children: String(avgDelayMinutes)
												}
											},
											{
												type: 'span',
												props: {
													style: { fontSize: '22px', color: '#fff', marginTop: '8px', position: 'relative', zIndex: 1 },
													children: 'min demora prom.'
												}
											}
										]
									}
								}
							]
						}
					},
					{
						type: 'div',
						props: {
							style: {
								display: 'flex',
								justifyContent: 'space-between',
								alignItems: 'center',
								marginTop: '24px'
							},
							children: [
								{
									type: 'span',
									props: {
										style: { fontSize: '26px', fontWeight: 900, color: '#000' },
										children: '#FailbondiWrapped2025'
									}
								},
								{
									type: 'span',
									props: {
										style: { fontSize: '22px', color: '#000', opacity: 0.6 },
										children: 'failbondi.fail/wrapped-2025'
									}
								}
							]
						}
					}
				]
			}
		},
		{
			width: 1200,
			height: 630,
			fonts: [
				{
					name: 'Inter',
					data: interFont,
					weight: 900,
					style: 'normal'
				}
			]
		}
	);

	const resvg = new Resvg(svg, {
		fitTo: {
			mode: 'width',
			value: 1200
		}
	});
	const pngData = resvg.render();
	const pngBuffer = pngData.asPng();

	return new Response(pngBuffer, {
		headers: {
			'Content-Type': 'image/png',
			'Cache-Control': 'public, max-age=3600'
		}
	});
};
