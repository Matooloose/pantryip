import { NextRequest, NextResponse } from 'next/server';
import { extractProfileFromTranscript } from '@/lib/huggingface';
import { z } from 'zod';

const RequestSchema = z.object({
  transcript: z.string().min(1, 'Transcript is required'),
  household_size: z.number().min(1).max(20).default(1),
});

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const body = await req.json();
    const { transcript, household_size } = RequestSchema.parse(body);

    console.log('\n🎤 ══════════════════════════════════════════════════════');
    console.log('   PROCESS VOICE — Analyzing transcript');
    console.log('══════════════════════════════════════════════════════');
    console.log(`  📝 Transcript: "${transcript.substring(0, 80)}${transcript.length > 80 ? '...' : ''}"`);
    console.log(`  👤 Household size: ${household_size}`);
    console.log('  🤖 Sending to Hugging Face AI for analysis...');
    console.log('  ⏳ This may take 10-20 seconds...\n');

    const profile = await extractProfileFromTranscript(transcript, household_size);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n  ✅ Profile extracted in ${elapsed}s`);
    console.log(`  🍽  Meals found: ${profile.meals.length}`);
    console.log(`  🥗 Dietary preferences: ${profile.dietary_preferences?.join(', ') || 'none'}`);
    console.log(`  ⚠️  Allergies: ${profile.allergies?.join(', ') || 'none'}`);
    console.log('══════════════════════════════════════════════════════\n');

    return NextResponse.json({
      success: true,
      transcript,
      profile,
    });
  } catch (error) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.error(`\n❌ PROCESS VOICE FAILED after ${elapsed}s`);
    console.error('  Error:', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Processing failed' },
      { status: 500 }
    );
  }
}

