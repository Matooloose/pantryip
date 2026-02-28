import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { extractProfileFromTranscript } from '@/lib/claude';
import { z } from 'zod';

const RequestSchema = z.object({
  audio_base64: z.string().optional(),
  transcript: z.string().optional(), // Allow direct text input for testing
  household_size: z.number().min(1).max(20).default(1),
});

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { audio_base64, transcript: directTranscript, household_size } =
      RequestSchema.parse(body);

    let transcript: string;

    if (directTranscript) {
      transcript = directTranscript;
    } else if (audio_base64) {
      // Transcribe via Whisper-compatible endpoint
      // Note: Anthropic doesn't have Whisper; use OpenAI Whisper or Web Speech API
      // For the hackathon, the frontend uses Web Speech API and sends the transcript directly
      transcript = await transcribeAudio(audio_base64);
    } else {
      return NextResponse.json(
        { error: 'Either audio_base64 or transcript is required' },
        { status: 400 }
      );
    }

    const profile = await extractProfileFromTranscript(transcript, household_size);

    return NextResponse.json({
      success: true,
      transcript,
      profile,
    });
  } catch (error) {
    console.error('[process-voice] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Processing failed' },
      { status: 500 }
    );
  }
}

/**
 * Transcribes audio using OpenAI Whisper API.
 * Falls back to a descriptive error if OPENAI_API_KEY is not set.
 */
async function transcribeAudio(audioBase64: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'OPENAI_API_KEY not configured. Use the text input or set up OpenAI Whisper.'
    );
  }

  const audioBuffer = Buffer.from(audioBase64, 'base64');
  const blob = new Blob([audioBuffer], { type: 'audio/webm' });

  const formData = new FormData();
  formData.append('file', blob, 'audio.webm');
  formData.append('model', 'whisper-1');
  formData.append('language', 'en');

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Whisper API error: ${error}`);
  }

  const data = await response.json();
  return data.text;
}
