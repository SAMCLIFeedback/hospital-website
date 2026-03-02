const axios = require('axios');
require('dotenv').config();

// Slang map to translate local terms before sending to the LLM
const SLANG_MAP = {
  grabe: 'intense',
  sobrang: 'very',
  astig: 'cool',
  galing: 'great',
  salamat: 'thanks',
  talaga: 'really',
  kasi: 'because',
  pasensya: 'patience',
  wala: 'not',
  walah: 'not',
  lit: 'great',
  sucks: 'bad',
  chill: 'relaxed'
};

const SLANG_REGEX = new RegExp(`\\b(${Object.keys(SLANG_MAP).join('|')})\\b`, 'gi');

function preprocessText(text) {
  if (typeof text !== 'string' || !text.trim()) {
    return '';
  }
  return text.replace(SLANG_REGEX, match => SLANG_MAP[match.toLowerCase()]);
}

async function analyzeSentiment({ text, rating, impactSeverity, feedbackType, source = 'external' }) {
  const apiUrl = process.env.OLLAMA_API_URL;
  const apiKey = process.env.GROQ_API_KEY;

  if (typeof text !== 'string' || !text.trim()) {
    return 'neutral';
  }

  try {
    // Process local slang
    const processedText = preprocessText(text);
    
    // NEW PROMPT: 100% based on text description only
    const prompt = `
      Analyze the true emotional tone of the following feedback text.
      Base your decision 100% on the words provided below. Ignore any other assumptions.
      The feedback may be in English, Tagalog, or a mix of both.
      Respond with exactly one word only: "positive", "neutral", or "negative".

      Feedback: "${processedText}"
      Sentiment:
    `.trim();

    const payload = {
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: "You are a hospital QA sentiment analysis model. Only return one word: positive, neutral, or negative."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.1,
      top_p: 0.5
    };

    console.log("🟡 Sending sentiment prompt to Groq...");

    const response = await axios.post(apiUrl, payload, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    let sentiment = response.data.choices[0].message.content.trim().toLowerCase().replace(/[.,!]/g, '').split(/\s+/)[0];
    console.log("✅ Sentiment received from Groq:", sentiment);

    if (['positive', 'neutral', 'negative'].includes(sentiment)) {
      return sentiment;
    } else {
      console.warn(`⚠️ Unexpected sentiment: "${sentiment}". Defaulting to neutral.`);
      return 'neutral';
    }
  } catch (error) {
    console.error('❌ Error calling Groq for sentiment analysis:', error.response?.data || error.message);
    return 'neutral';
  }
}

module.exports = { analyzeSentiment };