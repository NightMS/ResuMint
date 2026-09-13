import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const records = await db.resumeVersion.findMany({
      orderBy: { createdAt: "desc" },
    });

    const formatted = records.map((rec) => ({
      id: rec.id,
      name: `Resume_${rec.id.slice(0, 5)}.pdf`,
      createdAt: rec.createdAt.toISOString(),
      updatedAt: rec.updatedAt.toISOString(),
      atsScore: rec.atsScore ?? undefined,
      atsApproved: rec.atsApproved ?? undefined,
      data: JSON.parse(rec.jsonPayload || "{}"),
    }));

    return NextResponse.json({ resumes: formatted });
  } catch (error) {
    console.error("Failed to fetch resumes:", error);
    return NextResponse.json({ error: "Failed to fetch resumes" }, { status: 500 });
  }
}