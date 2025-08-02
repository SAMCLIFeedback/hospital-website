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

function buildPrompt({ text, rating, impactSeverity, feedbackType, source = 'external' }) {
  let context = `This feedback was submitted by a ${source === 'internal' ? 'hospital staff member' : 'patient or visitor'}.`;

  if (feedbackType) {
    context += ` The feedback type is "${feedbackType}".`;
  }
  if (rating) {
    context += ` The user gave a rating of ${rating} out of 5 stars.`;
  }
  if (source === 'internal' && impactSeverity) {
    context += ` The staff reported the impact on operations as "${impactSeverity}".`;
  }

  if (rating >= 4 && /sucks|bagal|grabe|not good|worst|disappointed|nakakainis|horrible/i.test(text)) {
    context += ` Be alert for sarcasm — the rating is high but the wording may suggest frustration.`;
  }

  if (feedbackType?.toLowerCase() === 'complaint') {
    context += ` Treat this as negative even if it uses polite or softened language.`;
  }

  return `
    Analyze the true emotional tone of the following hospital feedback.
    You are given contextual information, but the user's actual written description is the most important signal.
    The feedback may be in English, Tagalog, or a mix of both.
    If the text expresses strong dissatisfaction, classify it as negative — even if the rating or type is positive.
    Respond with exactly one word only: "positive", "neutral", or "negative".

    Context: ${context}
    Feedback: "${text}"
    Sentiment:
  `.trim();
}

async function analyzeSentiment({ text, rating, impactSeverity, feedbackType, source = 'external' }) {
  const apiUrl = process.env.OLLAMA_API_URL;
  const apiKey = process.env.GROQ_API_KEY;

  if (typeof text !== 'string' || !text.trim()) {
    return 'neutral';
  }

  try {
    const processedText = preprocessText(text);
    const prompt = buildPrompt({
      text: processedText,
      rating,
      impactSeverity,
      feedbackType,
      source
    });

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