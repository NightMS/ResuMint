import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { GoogleGenAI } from "@google/genai";
import { getPath } from "pdf-parse/worker";
import { PDFParse } from "pdf-parse";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// Configure PDF.js worker
PDFParse.setWorker(getPath());

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file uploaded" },
        { status: 400 }
      );
    }

    // Convert uploaded file to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parse PDF
    const parser = new PDFParse({
      data: buffer,
    });

    const pdfResult = await parser.getText();
    const extractedText = pdfResult.text;

    // Clean up parser resources
    await parser.destroy();

    if (!extractedText || extractedText.trim().length === 0) {
      return NextResponse.json(
        {
          error:
            "Could not extract text from PDF. It might be an image-based scan.",
        },
        { status: 400 }
      );
    }

    // Gemini prompt to format raw text into JSON schema
    const prompt = `
      You are an expert resume parser. Analyze the following raw resume text
      and extract the structured data into valid JSON matching this schema:

      {
        "basics": {
          "name": string,
          "title": string,
          "email": string,
          "phone": string,
          "summary": string
        },
        "skills": string[],
        "experience": [
          {
            "company": string,
            "position": string,
            "startDate": string,
            "endDate": string,
            "highlights": string[]
          }
        ],
        "education": [
          {
            "institution": string,
            "area": string,
            "studyType": string,
            "startDate": string,
            "endDate": string
          }
        ]
      }

      If a field cannot be found in the resume, use an empty string.
      If there are no skills, experience, or education entries, use an empty array.

      Raw Resume Text:
      """
      ${extractedText}
      """
    `;

    // Send extracted resume text to Gemini
    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
    });

    const jsonString = response.text;

    if (!jsonString) {
      return NextResponse.json(
        { error: "Gemini returned an empty response" },
        { status: 500 }
      );
    }

    const cleanedJson = jsonString
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    const parsedJson = JSON.parse(cleanedJson);
    // Save structured payload to MySQL
    const newResume = await db.resumeVersion.create({
      data: {
        jsonPayload: JSON.stringify(parsedJson),
      },
    });

    return NextResponse.json({
      success: true,
      resumeVersionId: newResume.id,
      data: parsedJson,
    });
  } catch (error) {
    console.error("PDF Parsing Error:", error);

    return NextResponse.json(
      {
        error: "Failed to process and structure PDF resume",
      },
      { status: 500 }
    );
  }
}
