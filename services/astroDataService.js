import axios from 'axios'

export async function getRawChartData(data) {
    const userId = process.env.ASTRO_USER_ID;
    const apiKey = process.env.ASTRO_API_KEY;
    // Encode the credentials using base64
    const auth = Buffer.from(`${userId}:${apiKey}`).toString('base64');

    console.log(userId + " userID")
    console.log(data + " data")
    // Set up the headers
    const headers = {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
    };

    // Make the POST request using axios
    return axios.post(`https://json.astrologyapi.com/v1/western_horoscope`, data, { headers })
        .then(response => response.data)
        .catch(error => {
        console.error('Error calling API:', error);
        throw error;
    });
}


export async function getPlanetsData(data) {
    const userId = process.env.ASTRO_USER_ID;
    const apiKey = process.env.ASTRO_API_KEY;
    // Encode the credentials using base64
    const auth = Buffer.from(`${userId}:${apiKey}`).toString('base64');

    console.log(userId + " userID")
    console.log(data + " data")
    // Set up the headers
    const headers = {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
    };

    // Make the POST request using axios
    return axios.post(`https://json.astrologyapi.com/v1/planets/tropical`, data, { headers })
        .then(response => response.data)
        .catch(error => {
        console.error('Error calling API:', error);
        throw error;
    });
}


