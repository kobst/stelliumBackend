import { generateTransitSeries, scanTransitSeries, mergeTransitWindows } from '../services/ephemerisDataService.js';

export async function handleGetTransitWindows(req, res) {
  try {
    const { natalPlanets, from, to } = req.body;
    if (!Array.isArray(natalPlanets) || !from || !to) {
      return res.status(400).json({ error: 'natalPlanets, from and to are required' });
    }

    const fromDate = new Date(from);
    const toDate = new Date(to);

    const series = generateTransitSeries(fromDate, toDate);

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
