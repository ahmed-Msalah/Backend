const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

const getUserRecomndations = async (usageData) => {
    const prompt = `
Analyze the power usage for a smart home. 

User's past power consumption:
${usageData.map(entry =>
        `At ${entry.time}, device ${entry.deviceId} consumed ${entry.usage}Wh`
    ).join("\n")}

Key Questions:
1. What are the peak hours of high power consumption?
2. Which devices consume the most energy?
3. How can the user optimize power usage to reduce electricity costs?
4. Suggest best times to turn off high-power devices.

Output JSON format:
{
  "peakHours": ["time1", "time2"],
  "highConsumptionDevices": [{"deviceId": "id", "usage": value}],
  "recommendations": ["suggestion1", "suggestion2"]
}
`;

    try {
        const response = await axios.post(
            "https://api.openai.com/v1/chat/completions",
            {
                model: "gpt-4",
                messages: [{ role: "system", content: prompt }],
                temperature: 0.7,
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                    "Content-Type": "application/json",
                },
            }
        );

        return response.data.choices[0].message.content;
    } catch (error) {
        console.error("Error fetching recommendations:", error);
        return null;
    }
};

const getOpenAIResponse = async (prompt) => {
    try {

        const response = await axios.post(
            "https://api.openai.com/v1/completions",
            {
                model: "gpt-4",
                prompt,
                max_tokens: 300,
                temperature: 0.5,
            },
            {
                headers: {
                    "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
                    "Content-Type": "application/json",
                },
            }
        );

        return response.data.choices[0].text.trim();
    } catch (error) {
        console.error("OpenAI API Error:", error.response?.data || error.message);
        throw new Error("Failed to get response from OpenAI");
    }
};

module.exports = { getUserRecomndations, getOpenAIResponse };

