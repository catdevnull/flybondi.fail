export const COLORS = {
	[15 * 60]: '#7AE185',
	[30 * 60]: '#EDD200',
	[45 * 60]: '#FF7F0D',
	[60 * 60]: '#CF0000'
};
export const COLOR_CLASSES = {
	[15 * 60]: `text-[#7ae185] dark:text-green-600`,
	[30 * 60]: `text-[#edd200] dark:text-yellow-400`,
	[45 * 60]: `text-[#ff7f0d] dark:text-orange-400`,
	[60 * 60]: `text-[#cf0000] dark:text-red-400`
};
// si cambias los colores, tambien cambiar la escala en page.svelte
export function getDelayColor(delay: number, text: boolean = false) {
	if (delay <= 15 * 60) return text ? 'text-green-600 dark:text-green-600' : COLOR_CLASSES[15 * 60];
	// if (delay < 30 * 60) return 'text-green-500 dark:text-green-700';
	if (delay < 30 * 60)
		return text ? 'text-yellow-500 dark:text-yellow-400' : COLOR_CLASSES[30 * 60];
	if (delay < 45 * 60) return COLOR_CLASSES[45 * 60];
	return COLOR_CLASSES[60 * 60];
}

export function getDelaySimplified(delay: number) {
	if (delay <= 15 * 60) return 15 * 60;
	if (delay < 30 * 60) return 30 * 60;
	if (delay < 45 * 60) return 45 * 60;
	return 60 * 60;
}

export const AIRLINE_COLORS = {
	FO: '#FDBF15', // Flybondi red
	AR: '#75AADB', // Aerolineas Argentinas blue
	WJ: '#E31837', // JetSmart orange
	G3: '#00B0B5', // Gol teal
	JJ: '#E3001B', // LATAM red
	O4: '#004B8D', // Avianca blue
	'5U': '#00539B', // Azul blue
	ZP: '#E31837', // Paranair red
	H2: '#003876' // Amaszonas blue
} as const;
