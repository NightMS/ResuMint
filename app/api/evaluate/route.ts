import { NextResponse } from 'next/server';
import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';
import { db } from '@/lib/db';

const evaluationSchema = z.object({
  score: z.number().min(0).max(100),
  isApproved: z.boolean(),
  feedback: z.string(),
});

export async function POST(req: Request) {
  try {
    const { resumeVersionId, rawResumeText, targetRole, jobDescription } = await req.json();

    if (!targetRole || (!resumeVersionId && !rawResumeText)) {
      return NextResponse.json(
        { error: 'Missing required fields: targetRole and either resumeVersionId or rawResumeText.' },
        { status: 400 }
      );
    }

    let resumeContent = '';

    // Option A: Fetch from database if ID is provided
    if (resumeVersionId) {
      const resumeRecord = await db.resumeVersion.findUnique({
        where: { id: resumeVersionId },
      });

      if (!resumeRecord) {
        return NextResponse.json(
          { error: 'Resume version not found.' },
          { status: 404 }
        );
      }
      resumeContent = resumeRecord.jsonPayload;
    } 
    // Option B: Use raw text provided directly from an uploaded file
    else {
      resumeContent = rawResumeText;
    }

    const prompt = `
      You are an expert ATS (Applicant Tracking System) and Senior Technical Recruiter.
      Evaluate the following resume content against the target role and job description.

      Target Role: ${targetRole}
      Job Description: ${jobDescription || 'N/A'}

      Resume Content:
      ${resumeContent}

      Provide:
      1. A match score from 0 to 100.
      2. isApproved (true if score >= 75, false otherwise).
      3. Detailed constructive feedback highlighting missing keywords, strengths, and formatting improvements.
    `;

    const { object } = await generateObject({
      // Ensure this matches the model string format working in your other routes
      model: google('models/gemini-3.6-flash'), 
      schema: evaluationSchema,
      prompt,
    });

    // Optionally save to DB only if it was an internal resume version
    if (resumeVersionId) {
      await db.atsEvaluation.create({
        data: {
          resumeVersionId,
          targetRole,
          score: object.score,
          isApproved: object.isApproved,
          feedback: object.feedback,
        },
      });
    }

    return NextResponse.json(
      { message: 'ATS evaluation completed.', evaluation: object },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('ATS Evaluation Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to process ATS evaluation.';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}