'use client';

import { GoogleGenAI } from '@google/genai';

export type PlayerEmotion = 'happy' | 'angry' | 'sad' | 'confused' | 'neutral' | 'stressed';

interface EmotionResult {
  emotion: PlayerEmotion;
  confidence: number;
  description: string;
}

/**
 * Detect player emotion from front camera image
 */
export async function detectFaceEmotion(
  imageData: string,
  apiKey: string
): Promise<EmotionResult | null> {
  try {
    const ai = new GoogleGenAI({ apiKey });
    const base64Image = imageData.replace(/^data:image\/\w+;base64,/, '');

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{
        role: 'user',
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Image,
            }
          },
          {
            text: `Analyze the person's facial expression in this image.

Respond ONLY with JSON (no markdown):
{
  "emotion": "happy" | "angry" | "sad" | "confused" | "neutral" | "stressed",
  "confidence": 0.0 to 1.0,
  "description": "brief description in Singlish"
}

Example responses:
{"emotion": "happy", "confidence": 0.8, "description": "Wah, you smiling sia!"}
{"emotion": "stressed", "confidence": 0.7, "description": "Eh, you look damn stressed leh"}
{"emotion": "confused", "confidence": 0.9, "description": "Blur like sotong ah you"}

If no face visible, return:
{"emotion": "neutral", "confidence": 0, "description": "Cannot see face lah"}`
          }
        ]
      }]
    });

    const text = response.text || '';
    const jsonMatch = text.match(/\{[\s\S]*?\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as EmotionResult;
    }
  } catch (err) {
    console.error('[EmotionDetector] Error:', err);
  }
  return null;
}

/**
 * Analyze emotion from text (what player said)
 */
export async function analyzeTextEmotion(
  text: string,
  apiKey: string
): Promise<EmotionResult | null> {
  try {
    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{
        role: 'user',
        parts: [{
          text: `Analyze the emotional tone of this speech:
"${text}"

Consider:
- Word choice (angry words, pleading, friendly)
- Punctuation (exclamation = intense)
- Context clues

Respond ONLY with JSON:
{
  "emotion": "happy" | "angry" | "sad" | "confused" | "neutral" | "pleading" | "friendly",
  "confidence": 0.0 to 1.0,
  "description": "brief Singlish description of their tone"
}

Examples:
{"emotion": "angry", "confidence": 0.8, "description": "Wah, damn fierce sia this one"}
{"emotion": "pleading", "confidence": 0.7, "description": "Sounds like begging leh"}
{"emotion": "friendly", "confidence": 0.9, "description": "Very nice way of talking"}`
        }]
      }]
    });

    const responseText = response.text || '';
    const jsonMatch = responseText.match(/\{[\s\S]*?\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as EmotionResult;
    }
  } catch (err) {
    console.error('[EmotionAnalyzer] Error:', err);
  }
  return null;
}
