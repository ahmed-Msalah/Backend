const { GoogleGenerativeAI } = require('@google/generative-ai');
const dotenv = require('dotenv');
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const getUserRecomndations = async usageData => {
  if (!usageData || usageData.length === 0) {
    console.error('❌ usageData is empty or invalid');
    return { recommendations: null };
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const prompt = `
Analyze the power usage for a smart home.

User's past power consumption:
${usageData.map(entry => `At ${entry.time}, device ${entry.deviceId} consumed ${entry.usage}Wh`).join('\n')}

Answer ONLY in JSON format. Do NOT include any explanation or extra text.
Output format:
{
  "peakHours": ["time1", "time2"],
  "highConsumptionDevices": [{"deviceId": "id", "usage": value}],
  "recommendations": ["suggestion1", "suggestion2"]
}
`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = await response.text();

    console.log('📥 Gemini raw response:\n', text);

    // تنظيف النص من علامات ```json و ```
    const cleanText = text
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();

    try {
      const json = JSON.parse(cleanText);
      return json;
    } catch (parseError) {
      console.error('❌ Failed to parse JSON from Gemini:', parseError.message);
      return { recommendations: null };
    }
  } catch (error) {
    console.error('❌ Gemini API Error:', error);
    return { recommendations: null };
  }
};

const getGeminiResponse = async prompt => {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = await response.text();
    return text.trim();
  } catch (error) {
    console.error('❌ Gemini API Error:', error);
    throw new Error('Failed to get response from Gemini');
  }
};

module.exports = {
  getUserRecomndations,
  getGeminiResponse,
};
