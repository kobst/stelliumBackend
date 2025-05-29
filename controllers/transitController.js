import { scanTransitSeries, mergeTransitWindows, generateTransitSeries } from '../services/ephemerisDataService.js';
import { getPreGeneratedTransitSeries } from '../services/dbService.js';

export async function handleGetTransitWindows(req, res) {
  try {
    const { natalPlanets, from, to } = req.body;
    if (!Array.isArray(natalPlanets) || !from || !to) {
      return res.status(400).json({ error: 'natalPlanets, from and to are required' });
    }

    const series = await getPreGeneratedTransitSeries(from, to);
    // const series = await generateTransitSeries(from, to);

    if (!series || series.length === 0) {
        console.warn(`No pre-generated transit data found for range: ${from} to ${to}. Proceeding with empty series.`);
    }

    const natal = natalPlanets.map(p => ({
      name: p.name,
      lon: p.lon ?? p.full_degree ?? p.fullDegree
    }));

    const rawEvents = Array.from(scanTransitSeries(series, natal));
    const windows = mergeTransitWindows(rawEvents);

    res.json({ rawEvents, windows });
  } catch (error) {
    console.error('Error generating transit windows:', error);
    res.status(500).json({ error: 'Server error' });
  }
}
