import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createCanvas } from "../.pdf-tools/node_modules/@napi-rs/canvas/index.js";
import { getDocument } from "../.pdf-tools/node_modules/pdfjs-dist/legacy/build/pdf.mjs";

const input = process.argv[2] || "assets/JIAHUAN_STUDIO_Resume.pdf";
const requestedPages = (process.argv[3] || "1,2,20,21")
  .split(",")
  .map(Number)
  .filter(Boolean);
const outputDirectory = process.argv[4] || "assets/resume-preview";
const data = new Uint8Array(await readFile(input));
const pdf = await getDocument({ data, disableWorker: true }).promise;
await mkdir(outputDirectory, { recursive: true });

for (const pageNumber of requestedPages) {
  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale: 1.6 });
  const canvas = createCanvas(viewport.width, viewport.height);
  const context = canvas.getContext("2d");
  await page.render({ canvas, canvasContext: context, viewport }).promise;
  const output = `${outputDirectory}/page-${String(pageNumber).padStart(2, "0")}.png`;
  await writeFile(output, canvas.toBuffer("image/png"));
  console.log(output);
}
