import { readFile, writeFile } from "node:fs/promises";
import { getDocument } from "../.pdf-tools/node_modules/pdfjs-dist/legacy/build/pdf.mjs";

const pdfPath = new URL("../assets/JIAHUAN_STUDIO_Resume.pdf", import.meta.url);
const data = new Uint8Array(await readFile(pdfPath));
const pdf = await getDocument({ data, disableWorker: true }).promise;
const pages = [];

for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale: 1 });
  const text = await page.getTextContent();
  pages.push({
    pageNumber,
    width: viewport.width,
    height: viewport.height,
    items: text.items
      .filter((item) => item.str.trim())
      .map((item) => ({
        text: item.str,
        x: Number(item.transform[4].toFixed(2)),
        y: Number(item.transform[5].toFixed(2)),
        width: Number(item.width.toFixed(2)),
        height: Number(item.height.toFixed(2)),
        fontName: item.fontName,
      })),
  });
}

await writeFile(
  new URL("../assets/resume-text-report.json", import.meta.url),
  JSON.stringify({ numPages: pdf.numPages, pages }, null, 2),
);

for (const page of pages) {
  console.log(`\n=== PAGE ${page.pageNumber} ${page.width}x${page.height} ===`);
  console.log(page.items.map((item) => item.text).join(" | "));
}
