import { NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";

export async function sendPdfResponse(pdfDoc: PDFDocument, filename: string) {
  const pdfBytes = await pdfDoc.save();

  return new NextResponse(new Uint8Array(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
