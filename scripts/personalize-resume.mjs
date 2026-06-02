import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { createCanvas, GlobalFonts, loadImage } from "../.pdf-tools/node_modules/@napi-rs/canvas/index.js";
import { getDocument } from "../.pdf-tools/node_modules/pdfjs-dist/legacy/build/pdf.mjs";

const require = createRequire(import.meta.url);
const { PDFDocument } = require("../.pdf-tools/node_modules/pdf-lib/cjs/index.js");

const sourcePath = "assets/JIAHUAN_STUDIO_Resume.pdf";
const outputPath = "assets/JIAHUAN_STUDIO_Portfolio.pdf";
const sourceBytes = await readFile(sourcePath);
const pdf = await PDFDocument.load(sourceBytes);
const renderPdf = await getDocument({
  data: new Uint8Array(sourceBytes),
  disableWorker: true,
}).promise;

GlobalFonts.registerFromPath("C:/Windows/Fonts/simhei.ttf", "SimHei");

const scale = 2;
const white = "#f5f7f5";
const muted = "#b8bfbf";
const neon = "#b8f500";
const douyinQr = await loadImage("assets/douyin-jiahuan.png");
const shipinhaoQr = await loadImage("assets/shipinhao-jiahuan.png");

function canvasRect(pageHeight, x, y, width, height) {
  return {
    x: Math.round(x * scale),
    y: Math.round((pageHeight - y - height) * scale),
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}

function sample(imageData, width, height, x, y) {
  const clampedX = Math.max(0, Math.min(width - 1, x));
  const clampedY = Math.max(0, Math.min(height - 1, y));
  const index = (clampedY * width + clampedX) * 4;
  return [
    imageData[index],
    imageData[index + 1],
    imageData[index + 2],
  ];
}

function mix(a, b, amount) {
  return a + (b - a) * amount;
}

// Replace covered content with a smooth interpolation of its surrounding
// pixels. This preserves the page's existing dark gradients without visible
// rectangular edges.
function inpaintPdfRect(ctx, pageHeight, x, y, width, height, options = {}) {
  const { axis = "both" } = options;
  const rect = canvasRect(pageHeight, x, y, width, height);
  const canvasWidth = ctx.canvas.width;
  const canvasHeight = ctx.canvas.height;
  const source = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
  const patch = ctx.createImageData(rect.width, rect.height);
  const border = Math.max(3, Math.round(3 * scale));

  for (let py = 0; py < rect.height; py += 1) {
    const v = rect.height <= 1 ? 0 : py / (rect.height - 1);
    for (let px = 0; px < rect.width; px += 1) {
      const u = rect.width <= 1 ? 0 : px / (rect.width - 1);
      const left = sample(source.data, canvasWidth, canvasHeight, rect.x - border, rect.y + py);
      const right = sample(source.data, canvasWidth, canvasHeight, rect.x + rect.width + border, rect.y + py);
      const top = sample(source.data, canvasWidth, canvasHeight, rect.x + px, rect.y - border);
      const bottom = sample(source.data, canvasWidth, canvasHeight, rect.x + px, rect.y + rect.height + border);
      const index = (py * rect.width + px) * 4;

      for (let channel = 0; channel < 3; channel += 1) {
        const horizontal = mix(left[channel], right[channel], u);
        const vertical = mix(top[channel], bottom[channel], v);
        patch.data[index + channel] = Math.round(axis === "horizontal"
          ? horizontal
          : axis === "vertical"
            ? vertical
            : (horizontal + vertical) / 2);
      }
      patch.data[index + 3] = 255;
    }
  }

  ctx.putImageData(patch, rect.x, rect.y);
}

function drawPdfText(ctx, pageHeight, text, x, y, size, options = {}) {
  const {
    color = white,
    family = "Arial",
    weight = "normal",
    align = "left",
  } = options;
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size * scale}px ${family}`;
  ctx.textAlign = align;
  ctx.textBaseline = "alphabetic";
  ctx.fillText(text, x * scale, (pageHeight - y) * scale);
}

function drawPdfImage(ctx, pageHeight, image, x, y, width, height) {
  const rect = canvasRect(pageHeight, x, y, width, height);
  ctx.drawImage(image, rect.x, rect.y, rect.width, rect.height);
}

function drawPdfRect(ctx, pageHeight, x, y, width, height, color) {
  const rect = canvasRect(pageHeight, x, y, width, height);
  ctx.fillStyle = color;
  ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
}

async function personalizePage(pageNumber, personalize) {
  const sourcePage = await renderPdf.getPage(pageNumber);
  const viewport = sourcePage.getViewport({ scale });
  const canvas = createCanvas(viewport.width, viewport.height);
  const ctx = canvas.getContext("2d");
  await sourcePage.render({ canvas, canvasContext: ctx, viewport }).promise;

  const pageHeight = sourcePage.getViewport({ scale: 1 }).height;
  await personalize(ctx, pageHeight);

  const outputPage = pdf.getPage(pageNumber - 1);
  const overlay = await pdf.embedPng(canvas.toBuffer("image/png"));
  outputPage.drawImage(overlay, {
    x: 0,
    y: 0,
    width: outputPage.getWidth(),
    height: outputPage.getHeight(),
  });
}

await personalizePage(1, async (ctx, pageHeight) => {
  inpaintPdfRect(ctx, pageHeight, 378, 349, 165, 31);
  drawPdfText(ctx, pageHeight, "林家欢 / Jiahuan", 450, 360, 11, {
    family: "SimHei",
    align: "center",
  });
});

await personalizePage(2, async (ctx, pageHeight) => {
  inpaintPdfRect(ctx, pageHeight, 45, 324, 310, 62, { axis: "horizontal" });
  drawPdfText(ctx, pageHeight, "林家欢", 49, 345, 25, {
    family: "SimHei",
    weight: "bold",
  });
  drawPdfText(ctx, pageHeight, "| Jiahuan", 137, 345, 25);

  inpaintPdfRect(ctx, pageHeight, 42, 292, 245, 35, { axis: "horizontal" });
  drawPdfText(ctx, pageHeight, "AI 漫剧制作师", 49, 307, 25, {
    color: neon,
    family: "SimHei",
    weight: "bold",
  });

  inpaintPdfRect(ctx, pageHeight, 610, 342, 270, 38);
  drawPdfText(ctx, pageHeight, "JIAHUAN STUDIO", 635, 350, 22, {
    color: neon,
    weight: "bold",
  });

  inpaintPdfRect(ctx, pageHeight, 42, 145, 500, 34, { axis: "vertical" });
  drawPdfText(ctx, pageHeight, "8 年视觉设计经验 × AI 漫剧全流程制作", 50, 158, 12, {
    family: "SimHei",
  });

  inpaintPdfRect(ctx, pageHeight, 45, 87, 760, 34);
  drawPdfText(ctx, pageHeight, "1956663923@qq.com  ·  微信 15988997215  ·  电话 15988997215", 50, 98, 12, {
    family: "SimHei",
    weight: "bold",
  });
});

await personalizePage(3, async (ctx, pageHeight) => {
  inpaintPdfRect(ctx, pageHeight, 300, 25, 205, 245, { axis: "vertical" });
});

await personalizePage(20, async (ctx, pageHeight) => {
  inpaintPdfRect(ctx, pageHeight, 555, 385, 335, 48);
  drawPdfText(ctx, pageHeight, "JIAHUAN STUDIO", 740, 398, 24, {
    color: neon,
    weight: "bold",
    align: "center",
  });

  inpaintPdfRect(ctx, pageHeight, 90, 74, 730, 255);
  drawPdfImage(ctx, pageHeight, shipinhaoQr, 225, 150, 165, 165);
  drawPdfImage(ctx, pageHeight, douyinQr, 510, 150, 165, 165);
  drawPdfText(ctx, pageHeight, "- 视频号扫码 -", 307.5, 111, 17, {
    color: muted,
    family: "SimHei",
    weight: "bold",
    align: "center",
  });
  drawPdfText(ctx, pageHeight, "- 抖音扫码 -", 592.5, 111, 17, {
    color: muted,
    family: "SimHei",
    weight: "bold",
    align: "center",
  });
});

await personalizePage(21, async (ctx, pageHeight) => {
  inpaintPdfRect(ctx, pageHeight, 38, 55, 527, 215, { axis: "horizontal" });
  drawPdfRect(ctx, pageHeight, 44, 75, 2, 150, neon);

  drawPdfText(ctx, pageHeight, "电话", 65, 205, 16, {
    color: neon,
    family: "SimHei",
    weight: "bold",
  });
  drawPdfText(ctx, pageHeight, "15988997215", 135, 205, 21, {
    weight: "bold",
  });

  drawPdfText(ctx, pageHeight, "微信", 65, 155, 16, {
    color: neon,
    family: "SimHei",
    weight: "bold",
  });
  drawPdfText(ctx, pageHeight, "15988997215", 135, 155, 21, {
    weight: "bold",
  });

  drawPdfText(ctx, pageHeight, "邮箱", 65, 105, 16, {
    color: neon,
    family: "SimHei",
    weight: "bold",
  });
  drawPdfText(ctx, pageHeight, "1956663923@qq.com", 135, 105, 19, {
    weight: "bold",
  });
});

await writeFile(outputPath, await pdf.save());
console.log(outputPath);
