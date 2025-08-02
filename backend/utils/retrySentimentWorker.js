const ExternalFeedback = require('../models/ExternalFeedback');
const InternalFeedback = require('../models/InternalFeedback');
const { analyzeSentiment } = require('../routes/analyzeSentiment');

const BATCH_LIMIT = 20; // Limit to avoid overloading Groq
const DELAY_BETWEEN_REQUESTS_MS = 200; // Pause between retries

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function retryFeedbackSentiment(Model, type) {
  try {
    const pending = await Model.find({
      sentiment_status: 'pending',
      sentiment_attempts: { $lt: 5 }
    }).limit(BATCH_LIMIT).lean();

    const results = [];

    for (const feedback of pending) {
      try {
        const sentiment = await analyzeSentiment({
          text: feedback.description,
          rating: type === 'external' ? feedback.rating : undefined,
          impactSeverity: feedback.impactSeverity,
          feedbackType: feedback.feedbackType,
          source: type
        });

        const updated = await Model.findOneAndUpdate(
          { id: feedback.id },
          {
            $set: {
              sentiment,
              sentiment_status: 'completed',
              sentiment_error: null,
              status: 'unassigned'
            },
            $inc: { sentiment_attempts: 1 }
          },
          { new: true }
        ).lean();

        console.log(`✅ Retry sentiment completed for ${feedback.id}: ${sentiment}`);
        if (updated) {
          global.io.emit('feedbackUpdate', updated);
        }

        results.push({
          id: feedback.id,
          sentiment,
          status: 'completed'
        });

      } catch (error) {
        const attempts = (feedback.sentiment_attempts || 0) + 1;
        const isMax = attempts >= 5;

        console.error(`❌ Retry failed for ${feedback.id}: ${error.message}`);
        if (error.response?.status === 429) {
          console.warn(`⚠️ Rate limit hit for ${feedback.id}. Consider increasing delay or reducing batch size.`);
        }

        const updated = await Model.findOneAndUpdate(
          { id: feedback.id },
          {
            $inc: { sentiment_attempts: 1 },
            $set: {
              sentiment_status: isMax ? 'failed' : 'pending',
              sentiment_error: error.message,
              status: isMax ? 'failed' : 'pending'
            }
          },
          { new: true }
        ).lean();

        if (updated) {
          global.io.emit('feedbackUpdate', updated);
        }

        results.push({
          id: feedback.id,
          status: isMax ? 'failed' : 'retrying',
          error: error.message
        });
      }

      // Wait to prevent API rate saturation
      await delay(DELAY_BETWEEN_REQUESTS_MS);
    }

    return results;
  } catch (e) {
    console.error('🔥 Unexpected error during retryFeedbackSentiment:', e);
    return [];
  }
}

async function runRetrySentiment() {
  try {
    const ext = await retryFeedbackSentiment(ExternalFeedback, 'external');
    const int = await retryFeedbackSentiment(InternalFeedback, 'internal');
    return [...ext, ...int];
  } catch (err) {
    console.error('❌ Error in runRetrySentiment:', err);
    return [];
  }
}

module.exports = runRetrySentiment;