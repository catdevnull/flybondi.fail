# Adding Airports

When adding airports that are NOT in `aerolineas-airports.json`:

1. **Don't add to** `/misc/aerolineas-airports.json` - that's for Aerolineas airports only
2. **Add to** `OTHER_AIRPORTS` object in `/sitio-sveltekit/src/routes/+page.svelte`

Example:
```ts
const OTHER_AIRPORTS = {
  CNQ: 'Corrientes',
  GIG: 'Rio de Janeiro',
  MCZ: 'Maceió'  // International airports, charter destinations, etc.
};
```

This prevents "Airport {IATA} not found" warnings when flights reference the airport.

## Airport Examples
- **MCZ**: Maceió, Brazil (Aeropuerto Internacional Zumbi dos Palmares)
- **GIG**: Rio de Janeiro
- **GRU**: São Paulo
- **USH**: Ushuaia
- **FLN**: Florianópolis
