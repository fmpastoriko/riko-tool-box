export function downloadPdf(
  puzzles: unknown[],
  apiEndpoint: string,
  filename: string,
): Promise<void> {
  return fetch(apiEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ puzzles }),
  })
    .then((res) => {
      if (!res.ok) throw new Error("PDF failed");
      return res.blob();
    })
    .then((blob) => {
      downloadBlob(blob, filename);
    });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadText(text: string, filename: string): void {
  downloadBlob(new Blob([text], { type: "text/plain" }), filename);
}
