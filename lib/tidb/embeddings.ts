// Embedding Generation for Player DNA
// Uses Gemini's embedding model for vector similarity search

import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Generate embedding using Gemini
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
    const result = await model.embedContent(text);
    return result.embedding.values;
  } catch (error) {
    console.error('Failed to generate embedding:', error);
    // Return a zero vector as fallback (384 dimensions)
    return new Array(384).fill(0);
  }
}

// Generate embedding for player journey (combines multiple aspects)
export async function generateJourneyEmbedding(journey: {
  playerType: string;
  chickenName?: string;
  chickenMood: number;
  ending?: string;
  locations: string[];
  traits: string[];
  emotions: string[];
  conversationCount: number;
  laughCount: number;
}): Promise<number[]> {
  const summary = `
    A ${journey.playerType.toLowerCase()} player who ${
      journey.chickenMood >= 70 ? 'took great care of' :
      journey.chickenMood >= 40 ? 'moderately cared for' :
      'struggled with'
    } their chicken${journey.chickenName ? ` named "${journey.chickenName}"` : ''}.
    They visited ${journey.locations.join(', ')} and experienced emotions like ${journey.emotions.join(', ')}.
    With ${journey.conversationCount} conversations and ${journey.laughCount} laughs, they achieved the ${journey.ending || 'unknown'} ending.
    Their traits: ${journey.traits.join(', ')}.
  `.trim();

  return generateEmbedding(summary);
}

// Calculate cosine similarity between two embeddings
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
