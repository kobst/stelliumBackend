import { getRawChartData, getPlanetsData } from '../services/astroDataService.js';
import { differenceInYears, addDays, parseISO } from 'date-fns';


export async function handleBirthData(req, res) {

  try {
    const { date, time, lat, lon, tzone } = req.body;
    // Parse date and time
    const [year, month, day] = date.split('-').map(Number);
    const [hour, minute] = time.split(':').map(Number);

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
  
    const chartData = await getRawChartData(data);
    
    res.json({ chartData});
  } catch (error) {
    console.error('Error in handleBirthData:', error);
    res.status(500).send('Server error');
  }
};



export async function handleProgressedChart(req, res) {
  try {
    const { date, time, lat, lon, tzone } = req.body;

    // Parse date and time
    const birthDate = parseISO(date);
    const [hour, minute] = time.split(':').map(Number);

    // Calculate the number of years from the birth date to the current date
    const yearsDifference = differenceInYears(new Date(), birthDate);

    // Add this number of years as days to the birth date
    const modifiedDate = addDays(birthDate, yearsDifference);

    // Extract day, month, year from the modified date
    const day = modifiedDate.getDate();
    const month = modifiedDate.getMonth() + 1; // Months are 0-indexed
    const year = modifiedDate.getFullYear();

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

    const chartData = await getPlanetsData(data);
    
    res.json({ chartData });
  } catch (error) {
    console.error('Error in handleModifiedBirthData:', error);
    res.status(500).send('Server error');
  }
};


export async function handleDayTransits(req, res) {
  try {
    console.log("handleDayTransit")
    console.log(req)
    const now = new Date();
    const day = now.getDate();
    const month = now.getMonth() + 1; // Months are 0-indexed
    const year = now.getFullYear();
    const hour = now.getHours();
    const minute = now.getMinutes();

    // default values
    const lat = 0.0; // Replace with your default or required value
    const lon = 0.0; // Replace with your default or required value
    const tzone = 0; // Replace with your default or required value

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
    const chartData = await getPlanetsData(data);
    
    res.json({ chartData });
  } catch (error) {
    console.error('Error in handleModifiedBirthData:', error);
    res.status(500).send('Server error');
  }
};
