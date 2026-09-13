import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;// Ensure your prisma client is imported

export async function POST(request: Request) {
  try {
    const data = await request.json();

    // Create a new record in your database table
    const savedResume = await prisma.resumeVersion.create({
      data: {
        jsonPayload: JSON.stringify(data),
      },
    });

    return NextResponse.json({ success: true, data: savedResume });
  } catch (error) {
    console.error("Database save error:", error);
    return NextResponse.json({ success: false, error: "Failed to save to database" }, { status: 500 });
  }
}