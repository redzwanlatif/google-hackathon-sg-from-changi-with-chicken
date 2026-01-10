import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// NPC System Prompts (simplified for API route)
const NPC_PROMPTS: Record<string, string> = {
  'airport-auntie': `You are a 50-year-old Malay Singaporean cleaner auntie at Changi Airport.
You found a confused person who slept on a bench with a chicken.
Use Singlish: "lah", "leh", "lor", "meh". Keep responses SHORT (2-3 sentences).
Guide them to Maxwell Food Centre for answers.`,

  'auntie-mei': `You are Auntie Mei Mei, 60-year-old hawker auntie at Maxwell Food Centre.
You are ANGRY - the player owes you $50 from last night.
Use Singlish. Start angry, give clues about "Marcus wedding" and "best man".
Keep responses SHORT.`,

  'grab-uncle': `You are Uncle Muthu, 55-year-old Grab driver.
You drove the player to 4 places looking for a chicken last night.
They cried about being "a bad friend". Mention "MBS" and "ceremony at 6pm".
Philosophical, use Singlish. Keep responses SHORT.`,

  'ah-beng': `You are Ah Beng, 25-year-old NSman at East Coast Park.
You know the player is Marcus's BEST MAN from the bachelor party.
Very "bro" energy, use lots of "bro". Reveal they're the best man.
Use Singlish. Keep responses SHORT.`,

  'jessica': `You are Jessica, stressed wedding planner.
The ceremony starts soon. Player has the chicken and the REAL ring.
Stressed, speaks fast. Guide them to MBS.
Use Singlish. Keep responses SHORT.`,

  'security-guard': `You are MBS security guard, 45 years old.
A person with a LIVE CHICKEN wants to enter for a wedding.
Stern but can be convinced. Check authorization.
Use Singlish. Keep responses SHORT.`,

  'marcus': `You are Marcus, the groom. Player is your best friend and best man.
You trusted them with the ceremonial chicken.
Emotional, grateful. This is your wedding day.
Use Singlish. Keep responses SHORT.`,
};

export async function POST(request: NextRequest) {
  try {
    const { npcId, message, history, gameContext } = await request.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY not configured' },
        { status: 500 }
      );
    }

    const systemPrompt = NPC_PROMPTS[npcId] || NPC_PROMPTS['airport-auntie'];
    const fullPrompt = gameContext
      ? `${systemPrompt}\n\nGAME CONTEXT:\n${gameContext}`
      : systemPrompt;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: fullPrompt,
    });

    // Build chat history
    const chatHistory = (history || []).map((msg: { role: string; text: string }) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }],
    }));

    const chat = model.startChat({ history: chatHistory });
    const result = await chat.sendMessage(message);
    const response = result.response.text();

    return NextResponse.json({ response });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate response' },
      { status: 500 }
    );
  }
}
