// place files you want to import through the `$lib` alias in this folder.

import { env } from '$env/dynamic/private';
import postgres from 'postgres';

export const sql = postgres(env.PG_URL);

export interface Flight {
	aerolineas_flight_id: string;
	last_updated: string;
	json: {
		id: string;
		mov: string;
		nro: string;
		arpt: string;
		stda: string;
		atda: (string & {}) | '';
		matricula: string;
		aerolinea: string;
		idaerolinea: string;
		IATAdestorig: string;
		estes?: string;
	};
	config_de_asientos: string;
	arrival_atda?: Date;
}

export type Vuelo = Flight & { delta: number; atda?: Date; stda: Date };
