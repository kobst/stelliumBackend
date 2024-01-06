import { getRawChartData } from '../services/astroDataService.js';


export async function handleBirthData(req, res) {

  try {
    console.log("handle birthData xx")
    console.log(req.body)
    const { date, time, lat, lon, tzone } = req.body;

    // Parse date and time
    const [year, month, day] = date.split('-').map(Number);
    const [hour, minute] = time.split(':').map(Number);
    console.log(year)
    console.log(hour)
    console.log(minute)
    console.log(month)
    console.log(day)
    console.log(lat)
    console.log(lon)
    console.log(tzone)
    const data = {
        'day': day,
        'month': month,
        'year': year,
        'hour': hour,
        'min': minute,
        'lat': lat,
        'lon': lon,
        'tzone': tzone,
      }

    console.log(data)
    console.log("data")
    const chartData = await getRawChartData(data);
    
    res.json({ chartData});
  } catch (error) {
    console.error('Error in handleBirthData:', error);
    res.status(500).send('Server error');
  }
};
