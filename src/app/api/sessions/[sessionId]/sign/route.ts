import { NextRequest, NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";
import { supabaseAdmin } from "@/server/lib/supabase";
import { getAuthenticatedUserId } from "@/server/lib/supabase/server";
import { SUPABASE_BUCKET_NAME } from "@/common/config";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await context.params;
  const userId = await getAuthenticatedUserId();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { placements } = await request.json();

    // 1. Fetch current session to get version
    const { data: session, error: sessionError } = await supabaseAdmin
      .from("sessions")
      .select("pdf_version")
      .eq("id", sessionId)
      .eq("user_id", userId)
      .single();

    if (sessionError || !session) {
      throw new Error("Session not found");
    }

    const currentVersion = session.pdf_version || 0;
    const nextVersion = currentVersion + 1;
    const currentFilePath = `${sessionId}/${sessionId}_v${currentVersion}.pdf`;

    // 2. Download current PDF
    const { data: pdfBlob, error: downloadError } = await supabaseAdmin.storage
      .from(SUPABASE_BUCKET_NAME)
      .download(currentFilePath);

    if (downloadError) throw downloadError;

    const pdfDoc = await PDFDocument.load(await pdfBlob.arrayBuffer());
    const pages = pdfDoc.getPages();

    // 3. Apply each placement
    for (const placement of placements) {
      const { pageNumber, x, y, width, imageData } = placement;
      const pageIndex = pageNumber - 1;
      if (pageIndex < 0 || pageIndex >= pages.length) continue;

      const page = pages[pageIndex];
      const { width: pdfWidth, height: pdfHeight } = page.getSize();

      // Convert data URL to buffer
      const base64Data = imageData.split(",")[1];
      const imageBuffer = Buffer.from(base64Data, "base64");
      
      const signatureImage = await pdfDoc.embedPng(imageBuffer);
      const sigDims = signatureImage.scale(1); // We'll use the provided width

      // Map coordinates
      // Client-side X and Y are relative to containerWidth
      // xRatio = x / containerWidth
      // pdfX = xRatio * pdfWidth
      // Note: pdf-lib Y starts from bottom
      // yRatio = y / containerHeight
      // pdfY = pdfHeight - (yRatio * pdfHeight)

      const pdfX = (x / placement.containerWidth) * pdfWidth;
      const pdfY = pdfHeight - ((y / placement.containerHeight) * pdfHeight) - ((width / placement.containerWidth) * pdfWidth * (sigDims.height / sigDims.width));

      const scaledWidth = (width / placement.containerWidth) * pdfWidth;
      const scaledHeight = scaledWidth * (sigDims.height / sigDims.width);

      page.drawImage(signatureImage, {
        x: pdfX,
        y: pdfY,
        width: scaledWidth,
        height: scaledHeight,
      });
    }

    // 4. Save and upload new version
    const pdfBytes = await pdfDoc.save();
    const nextFilePath = `${sessionId}/${sessionId}_v${nextVersion}.pdf`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from(SUPABASE_BUCKET_NAME)
      .upload(nextFilePath, pdfBytes, {
        contentType: "application/pdf",
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) throw uploadError;

    // 5. Update session version
    const { error: updateError } = await supabaseAdmin
      .from("sessions")
      .update({ pdf_version: nextVersion })
      .eq("id", sessionId);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true, version: nextVersion });
  } catch (error: any) {
    console.error("[SignRoute] POST error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
