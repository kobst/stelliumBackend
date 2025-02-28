import { 
    getDailyTransits, 
    getDailyAspects, 
    getPeriodAspects, 
    getRetrogrades, 
    getRetrogradesForDateRange,
    getPeriodTransits,
    getPeriodTransitsObject, 
    getBirthChart, 
    saveUser, 
    saveCompositeChart,
    getCompositeCharts,
    getCompositeChartInterpretation,
    saveCompositeChartInterpretation,
    getSynastryInterpretation,
    getUsers,
    getUserSingle,
    saveUserTransitAspects, 
    getPeriodAspectsForUser,
    saveBirthChartInterpretation,
    getBirthChartInterpretation,
    saveDailyTransitInterpretationData,
    saveWeeklyTransitInterpretationData,
    getWeeklyTransitInterpretationData,
    upsertVectorizedInterpretation,
    getDailyTransitInterpretationData} from '../services/dbService.js'

import { findDailyTransitAspectsForBirthChart, 
    createGroupedTransitObjects, 
    findAspectsForBirthChart,
    trackPlanetaryTransits,
    trackPlanetaryHouses,
    } from '../utilities/generateTransitAspects.js'

import { findSynastryAspects, generateCompositeChart } from '../utilities/generateSynastryAspects.js';

// all GENERAL DAILY ASPECTS/TRANSITS 
export async function handleDailyTransits (req, res) {
    try {
        const date = req.body.date;
        const transits = await getDailyTransits(date);
        res.status(200).json(transits);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


export async function handleDailyAspects (req, res) {
    try {
        const date = req.body.date;
        const aspects = await getDailyAspects(date);
        res.status(200).json(aspects);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


// all GENERAL DAILY ASPECTS fro a period of dates
export async function handlePeriodTransits (req, res) {
    try {
        const { startDate, endDate } = req.body;
        const transits = await getPeriodTransitsObject(startDate, endDate);
        res.status(200).json(transits);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export async function handlePeriodAspects (req, res)  {
    try {
        const { startDate, endDate } = req.body;
        const aspects = await getPeriodAspects(startDate, endDate);
      
        res.status(200).json(aspects);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export async function handleRetrogrades (req, res) {
    try {
        const date = req.body.date;
        const retrogrades = await getRetrogrades(date);
        res.status(200).json(retrogrades);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export async function handleRetrogradesForDateRange (req, res) {
    try {
        const { startDate, endDate } = req.body;
        const retrogrades = await getRetrogradesForDateRange(startDate, endDate);
        res.status(200).json(retrogrades);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export async function generateSummaryTransitSignsForPeriod (req, res) {
    try {
        const { startDate, endDate } = req.body;

        const transitData = await getPeriodTransits(startDate, endDate);
       
        const transits = trackPlanetaryTransits(transitData);
        res.status(200).json(transits);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};



// all BIRTHCHART SPECIFIC DAILY ASPECTS/TRANSITS 
export async function generatePeriodAspectsForChart (req, res) {
    try {
        const { startDate, endDate, birthChart } = req.body;
        console.log(startDate)
        console.log(endDate)
        const groupedTransits = await getPeriodTransits(startDate, endDate);
        const transits = findDailyTransitAspectsForBirthChart(groupedTransits, birthChart) 
        const groupedAspects = createGroupedTransitObjects(transits)
        res.status(200).json(groupedAspects);
        // TODO: save this to database
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


export async function generateSummaryTransitHousesforBirthChart (req, res) {
    try {
        const { startDate, endDate, birthChartHouses } = req.body;
        console.log(startDate)
        console.log(endDate)
        console.log(birthChartHouses)
        const transitData = await getPeriodTransits(startDate, endDate);
        const transits = trackPlanetaryHouses(transitData, birthChartHouses);
        console.log(transits)
        res.status(200).json(transits);
        // TODO: save transits to databse

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


// produces the full summary of transits for the birthchart for a given period of dates and USER ID, 
//saves to the user_transit_aspects collection
export async function generateSummaryTransitsForUser(req, res) {
    console.log("generateSummaryTransitsForUser")
    try {
        const { startDate, endDate, userId } = req.body;
        console.log("Generating summary transits for:", { userId, startDate, endDate });

        // get the birthchart for the user
        const birthChart = await getBirthChart(userId);
        console.log("Birth chart planets:", birthChart.planets.length);

        const groupedTransits = await getPeriodTransits(startDate, endDate);
        const transits = findDailyTransitAspectsForBirthChart(groupedTransits, birthChart.planets);
        const groupedAspects = createGroupedTransitObjects(transits);

        // Save grouped aspects using the new service function
        const saveResult = await saveUserTransitAspects(groupedAspects, userId);

        res.status(200).json({
            success: true,
            message: "Summary transits generated and saved successfully",
            data: {
                userId,
                startDate,
                endDate,
                aspectsCount: groupedAspects.length,
                saveResult: {
                    upsertedId: saveResult.upsertedId
                }
            },
            groupedAspects
        });
    } catch (error) {
        console.error("Error in generateSummaryTransitsForUser:", error);
        res.status(500).json({
            success: false,
            message: "Failed to generate and save summary transits",
            error: error.message
        });
    }
};


export async function handleGetUsers(req, res) {
    console.log("handleGetUsers")
    try {
        const users = await getUsers();
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
        res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
        res.setHeader('Access-Control-Allow-Credentials', true);
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export async function handleGetUserSingle(req, res) {
    console.log("handleGetUserSingle")
    try {
        const { userId } = req.body;
        const user = await getUserSingle(userId);
        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export async function handleGetCompositeCharts(req, res) {
    console.log("handleGetCompositeCharts")
    try {
        const compositeCharts = await getCompositeCharts();
        res.status(200).json(compositeCharts);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// still needs to be done.....
export async function handleSaveUserProfile(req, res) {
    console.log("handleSaveUserProfile")
    try {
        const { email, firstName, lastName, dateOfBirth, placeOfBirth, time, totalOffsetHours, birthChart } = req.body;
        console.log("dateOfBirth: ", dateOfBirth)
        const aspectsComputed = findAspectsForBirthChart(birthChart.planets);
        birthChart.aspectsComputed = aspectsComputed;

        const user = { 
            email, 
            firstName, 
            lastName, 
            dateOfBirth, 
            placeOfBirth, 
            time, 
            totalOffsetHours, 
            birthChart
        };

        const result = await saveUser(user);
        console.log("insertedId: ", result.insertedId)
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
        res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
        res.setHeader('Access-Control-Allow-Credentials', true);
        res.status(200).json({ userId: result.insertedId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


export async function handleSaveCompositeChartProfile(req, res) {
    console.log("handleSaveCompositeChartProfile");
    try {
        const { userA_id, userB_id, userA_dateOfBirth, userB_dateOfBirth, userA_name, userB_name, synastryAspects, compositeBirthChart } = req.body;
        
        // Check if all required fields are present
        if (!userA_id || !userB_id || !userA_dateOfBirth || !userB_dateOfBirth || !userA_name || !userB_name || !synastryAspects || !compositeBirthChart) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        const compositeChart = {
            userA_id,
            userB_id,
            userA_dateOfBirth,
            userB_dateOfBirth,
            userA_name,
            userB_name,
            synastryAspects,
            compositeBirthChart
        };

        console.log("saveCompositeChart", compositeChart);

        const result = await saveCompositeChart(compositeChart);
        console.log("insertedId: ", result.insertedId);
        
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
        res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
        res.setHeader('Access-Control-Allow-Credentials', true);
        res.status(200).json({ compositeChartId: result.insertedId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

// maybe refactor to just take the birthchart and find the natal aspects
// Do I need this anymore?
export async function handleSingleTransitAspectsForChart (req, res) {
    try {
        const { transits, birthChart } = req.body;
        const groupedTransits = await findDailyTransitAspectsForBirthChart(transits, birthChart)
        res.status(200).json(groupedTransits);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export async function handlePeriodAspectsForUser (req, res)  {
    try {
        const { startDate, endDate, userId } = req.body;
        const aspects = await getPeriodAspectsForUser(startDate, endDate, userId);
      
        res.status(200).json(aspects);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export async function handleSaveBirthChartInterpretation(req, res) {
    console.log("handleSaveBirthChartInterpretation")
    try {
        const { userId, heading, promptDescription, interpretation } = req.body;
        const result = await saveBirthChartInterpretation(userId, heading, promptDescription, interpretation);
        await upsertVectorizedInterpretation(userId, heading, promptDescription, interpretation);
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export async function handleSaveCompositeChartInterpretation(req, res) {
    console.log("handleSaveCompositeChartInterpretation")
    try {
        const { compositeChartId, heading, promptDescription, interpretation, isCompositeChart } = req.body;
        const result = await saveCompositeChartInterpretation(compositeChartId, heading, promptDescription, interpretation, isCompositeChart);
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export async function handleGetBirthChartInterpretation(req, res) {
    try {
        const { userId } = req.body;
        const interpretation = await getBirthChartInterpretation(userId);
        res.status(200).json(interpretation);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export async function handleGetCompositeChartInterpretation(req, res) {
    try {
        const { compositeChartId } = req.body;
        const interpretation = await getCompositeChartInterpretation(compositeChartId);
        res.status(200).json(interpretation);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export async function handleGetSynastryChartInterpretation(req, res) {
    try {
        const { compositeChartId } = req.body;
        const interpretation = await getSynastryInterpretation(compositeChartId);
        res.status(200).json(interpretation);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


export async function handleSaveDailyTransitInterpretationData(req, res) {
    console.log("handleSaveDailyTransitInterpretationData")
    console.log(req.body)
    try {
        const { date, combinedAspectsDescription, dailyTransitInterpretation } = req.body;
        const dailyTransit = await saveDailyTransitInterpretationData(date, combinedAspectsDescription, dailyTransitInterpretation);
        res.status(200).json({ message: 'Daily transit data saved successfully', dailyTransit });
      } catch (error) {
        console.error('Error saving daily transit data:', error);
        res.status(500).json({ message: 'Error saving daily transit data', error: error.message });
      }
}

export async function handleGetDailyTransitInterpretationData(req, res) {
    console.log("handleGetDailyTransitInterpretationData")
    try {
        const { date } = req.body;
        const dailyTransit = await getDailyTransitInterpretationData(date);
        res.status(200).json(dailyTransit);
    } catch (error) {
        console.error('Error getting daily transit data:', error);
        res.status(500).json({ message: 'Error getting daily transit data', error: error.message });
    }
}


export async function handleSaveWeeklyTransitInterpretationData(req, res) {
    console.log("handleSaveWeeklyTransitInterpretationData")
    console.log(req.body)
    try {
        const { date, combinedAspectsDescription, weeklyTransitInterpretation, sign } = req.body;
        const weeklyTransit = await saveWeeklyTransitInterpretationData(date, combinedAspectsDescription, weeklyTransitInterpretation, sign);
        res.status(200).json({ message: 'Weekly transit data saved successfully', weeklyTransit });
    } catch (error) {
        console.error('Error saving weekly transit data:', error);          
        res.status(500).json({ message: 'Error saving weekly transit data', error: error.message });
    }
}

export async function handleGetWeeklyTransitInterpretationData(req, res) {
    console.log("handleGetWeeklyTransitInterpretationData")
    try {
        const { date } = req.body;
        const weeklyTransit = await getWeeklyTransitInterpretationData(date);
        res.status(200).json(weeklyTransit);
    } catch (error) {
        console.error('Error getting weekly transit data:', error);
        res.status(500).json({ message: 'Error getting weekly transit data', error: error.message });
    }
}           


export async function handleFindSynastryAspects(req, res) {
    console.log("handleFindSynastryAspects")
    try {
        const { birthData_1, birthData_2 } = req.body;
        // console.log("birthData_1: ", birthData_1.planets )
        // console.log("birthData_2: ", birthData_2.planets)
        const synastryAspects = await findSynastryAspects(birthData_1.planets, birthData_2.planets);
        res.status(200).json(synastryAspects);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function handleGenerateCompositeChart(req, res) {
    console.log("handleGenerateCompositeChart")
    try {
        const { birthChart1, birthChart2 } = req.body;
        console.log("birthChart1: ", birthChart1.planets[0])
        console.log("birthChart2: ", birthChart2.planets[0])
        const compositeChart = await generateCompositeChart(birthChart1, birthChart2);
        res.status(200).json(compositeChart);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
