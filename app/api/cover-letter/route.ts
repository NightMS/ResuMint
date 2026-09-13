import { NextResponse } from 'next/server';
import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import { db } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { resumeVersionId, targetRole, companyName, jobDescription } = await req.json();

    if (!resumeVersionId || !targetRole) {
      return NextResponse.json(
        { error: 'Missing required fields: resumeVersionId and targetRole.' },
        { status: 400 }
      );
    }

    const resumeRecord = await db.resumeVersion.findUnique({
      where: { id: resumeVersionId },
    });

    if (!resumeRecord) {
      return NextResponse.json(
        { error: 'Resume version not found.' },
        { status: 404 }
      );
    }

    const prompt = `
      Write a concise, natural, and personalized cover letter/message for a job application based on the candidate's resume and the provided job description.

      Target Role: ${targetRole}
      Company: ${companyName}
      Job Description:
      ${jobDescription}

      Guidelines:
      - Write from the perspective of an enthusiastic fresh graduate.
      - Keep it concise: around 2 to 3 short paragraphs.
      - Use a friendly, confident, and professional tone suitable for LinkedIn, JobStreet, or a direct job application.
      - Tailor the message specifically to the target role and company based on the job description.
      - Identify 1 to 2 of the candidate's most relevant skills, projects, education, or work experience from the resume and connect them directly to the job requirements.
      - Only mention experience, skills, technologies, projects, or achievements that are actually present in the resume. Do not invent or exaggerate anything.
      - Prioritize specific evidence from the resume over generic statements such as "passionate", "hardworking", "modern skill set", or "fresh perspective".
      - Do not claim that the candidate has researched or followed the company's work unless this information is explicitly provided.
      - Do not mention every skill from the resume. Focus only on the most relevant ones.
      - Make the writing sound like it was written by a real fresh graduate, not an AI-generated corporate template.
      - Avoid excessive corporate jargon and overly enthusiastic language.
      - Do not use exclamation marks.
      - Do not use Markdown formatting such as **bold**, bullet points, or headings.
      - If the hiring manager's name is not provided, start with "Dear Hiring Manager,".
      - Do not invent a hiring manager's name.
      - End with a simple and professional call to action expressing interest in discussing the opportunity.
      - Do not include placeholders such as [Your Name], [LinkedIn Profile], or [Contact Number]. The application system will add personal details separately.

      Return only the completed cover letter.
      `;

    const { text: content } = await generateText({
      model: google('gemini-3.6-flash'),
      prompt,
    });

    const coverLetter = await db.coverLetter.create({
      data: {
        resumeVersionId,
        targetRole,
        companyName: companyName || null,
        content,
      },
    });

    return NextResponse.json(
      { message: 'Cover letter generated successfully.', coverLetter },
      { status: 200 }
    );
  } catch (error) {
    console.error('Cover Letter Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate cover letter.' },
      { status: 500 }
    );
  }
}