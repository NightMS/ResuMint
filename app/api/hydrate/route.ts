import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import fs from "fs/promises";
import path from "path";

export async function POST() {
  try {
    const filePath = path.join(process.cwd(), "backups", "resume_latest.json");
    let fileData = "";

    try {
      fileData = await fs.readFile(filePath, "utf-8");
    } catch {
      fileData = JSON.stringify({
        name: "Chan Kwok Ferng",
        title: "Software Engineer",
        skills: ["Next.js", "TypeScript", "Prisma", "MySQL"],
      });
    }

    const jsonData = JSON.parse(fileData);

    const newResume = await db.resumeVersion.create({
      data: {
        jsonPayload: JSON.stringify(jsonData), // Updated field name
      },
    });

    return NextResponse.json({
      success: true,
      resumeVersionId: newResume.id,
      data: jsonData,
    });
  } catch (err) {
    console.error("Hydration Error:", err);
    return NextResponse.json({ error: "Failed to hydrate database" }, { status: 500 });
  }
}