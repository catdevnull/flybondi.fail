// place files you want to import through the `$lib` alias in this folder.

import { env } from '$env/dynamic/private';
import postgres from 'postgres';

export const sql = postgres(env.DATABASE_URL!, { idle_timeout: 5 });

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
	matricula: string;
	// aeronave: string;
	// msn: string;
	// compania_aerea: string;
	// situacion: string;
	// detail_url: string;
	// edad_del_avion: number;
	config_de_asientos: string;
}

export type Vuelo = Flight & { delta: number; atda?: Date; stda: Date };
