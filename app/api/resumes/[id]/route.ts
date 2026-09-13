import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams.id;

    if (!id || id === "undefined") {
      return NextResponse.json(
        { error: "Invalid or missing resume ID" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const payload = body.data || body;

    const updated = await db.resumeVersion.update({
      where: { id },
      data: {
        jsonPayload: JSON.stringify(payload),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, resume: updated });
  } catch (error) {
    console.error("PUT /api/resumes/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to save resume" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams.id;

    if (!id || id === "undefined") {
      return NextResponse.json(
        { error: "Invalid or missing resume ID" },
        { status: 400 }
      );
    }

    await db.resumeVersion.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Resume deleted successfully" });
  } catch (error) {
    console.error("DELETE /api/resumes/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete resume" },
      { status: 500 }
    );
  }
}