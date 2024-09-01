import axios from 'axios'
import { modifyRawBirthData } from '../utilities/modifyRawBirthData.js'

export async function getRawChartData(data) {
    const userId = process.env.ASTRO_USER_ID;
    const apiKey = process.env.ASTRO_API_KEY;
    // Encode the credentials using base64
    const auth = Buffer.from(`${userId}:${apiKey}`).toString('base64');

    console.log(userId + " userID")
    // console.log(data + " data")
    // Set up the headers
    const headers = {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
    };

    // Make the POST request using axios
    // Make the POST request using axios
    try {
        const response = await axios.post(`https://json.astrologyapi.com/v1/western_horoscope`, data, { headers });
        // console.log(response.data)
        // Modify the response here using the modifyResponseData function
        const modifiedData = modifyRawBirthData(response.data);
        return modifiedData;
        // return response.data
    } catch (error) {
        console.error('Error calling API:', error);
        throw error;
    }
}



export async function getPlanetsData(data) {
    const userId = process.env.ASTRO_USER_ID;
    const apiKey = process.env.ASTRO_API_KEY;
    // Encode the credentials using base64
    const auth = Buffer.from(`${userId}:${apiKey}`).toString('base64');

    // console.log(userId + " userID")
    // console.log(data + " data")
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


