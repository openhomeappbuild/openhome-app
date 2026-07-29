import "server-only";
import {
  Color,
  PDFDocument,
  PDFFont,
  PDFPage,
  StandardFonts,
  clip,
  closePath,
  endPath,
  lineTo,
  moveTo,
  popGraphicsState,
  pushGraphicsState,
} from "pdf-lib";
import { COLOR, MARGIN, PAGE_HEIGHT, PAGE_WIDTH } from "./theme";
import { wrapText } from "./text";

export type EnquiryRow = {
  contact_date: string;
  name: string;
  source: string | null;
  comment: string | null;
  price_feedback: string | null;
  interest_status: "interested" | "not_interested" | "unsure";
  inspected: boolean;
};

export type VendorReportInput = {
  address: string;
  suburb: string;
  region: string;
  vendorName: string | null;
  saleMethod: string | null;
  listingUrl: string | null;
  agentName: string;
  agentPhone: string;
  agentEmail: string;
  photo: { bytes: Uint8Array; contentType: string } | null;
  periodStartLabel: string;
  periodEndLabel: string;
  reportDateLabel: string;
  daysOnMarket: number;
  campaignNote: string;
  enquiries: EnquiryRow[];
  attendance: {
    totalGroups: number;
    localGroups: number;
    outOfAreaGroups: number;
    tierCounts: Record<"AAA" | "AA" | "A" | "B" | "C", number>;
  };
  portalFiles: { bytes: Uint8Array }[];
};

export async function buildVendorReportPdf(input: VendorReportInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Vendor report - ${input.address}`);
  doc.setProducer("Open Home App");

  const fonts = {
    body: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
  };

  await drawCoverPage(doc, fonts, input);
  drawCampaignOverviewPage(doc, fonts, input);
  drawEnquiryLogPages(doc, fonts, input);
  drawAttendancePage(doc, fonts, input);
  drawMarketingActivityPage(doc, fonts, input);
  drawBackCoverPage(doc, fonts, input);

  for (const portal of input.portalFiles) {
    try {
      const srcDoc = await PDFDocument.load(portal.bytes);
      const pages = await doc.copyPages(srcDoc, srcDoc.getPageIndices());
      for (const page of pages) doc.addPage(page);
    } catch {
      // Skip any file that isn't a readable PDF rather than failing the whole report.
    }
  }

  return doc.save();
}

function newPage(doc: PDFDocument) {
  return doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
}

function footer(page: PDFPage, fonts: { body: PDFFont; bold: PDFFont }) {
  const y = 28;
  const tagline = "ALTOGETHER BETTER";
  page.drawText(tagline, {
    x: MARGIN,
    y,
    size: 8,
    font: fonts.bold,
    color: COLOR.navy,
  });
  const services = "Residential  |  Commercial  |  Rural  |  Property Services";
  const w = fonts.body.widthOfTextAtSize(services, 8);
  page.drawText(services, {
    x: PAGE_WIDTH - MARGIN - w,
    y,
    size: 8,
    font: fonts.body,
    color: COLOR.greyLight,
  });
}

async function drawCoverPage(doc: PDFDocument, fonts: { body: PDFFont; bold: PDFFont }, input: VendorReportInput) {
  const page = newPage(doc);
  const photoHeight = 440;
  const photoY = PAGE_HEIGHT - photoHeight;

  if (input.photo) {
    try {
      const isPng = input.photo.contentType.includes("png");
      const image = isPng ? await doc.embedPng(input.photo.bytes) : await doc.embedJpg(input.photo.bytes);
      const scale = Math.max(PAGE_WIDTH / image.width, photoHeight / image.height);
      const drawW = image.width * scale;
      const drawH = image.height * scale;
      const drawX = (PAGE_WIDTH - drawW) / 2;
      const drawY = photoY + (photoHeight - drawH) / 2;

      // Clip to the cover box before drawing — "cover" scaling always produces
      // an image larger than the box on one axis, which would otherwise bleed
      // into the grey info band below.
      page.pushOperators(
        pushGraphicsState(),
        moveTo(0, photoY),
        lineTo(PAGE_WIDTH, photoY),
        lineTo(PAGE_WIDTH, PAGE_HEIGHT),
        lineTo(0, PAGE_HEIGHT),
        closePath(),
        clip(),
        endPath()
      );
      page.drawImage(image, { x: drawX, y: drawY, width: drawW, height: drawH });
      page.pushOperators(popGraphicsState());
    } catch {
      drawPhotoPlaceholder(page, fonts, 0, photoY, PAGE_WIDTH, photoHeight);
    }
  } else {
    drawPhotoPlaceholder(page, fonts, 0, photoY, PAGE_WIDTH, photoHeight);
  }

  // Grey info band.
  const bandTop = photoY;
  page.drawRectangle({ x: 0, y: 0, width: PAGE_WIDTH, height: bandTop, color: COLOR.band });
  page.drawLine({
    start: { x: 0, y: bandTop },
    end: { x: PAGE_WIDTH, y: bandTop },
    thickness: 1,
    color: COLOR.bandLine,
  });

  let y = bandTop - 56;
  page.drawText("Vendor report", { x: MARGIN, y, size: 26, font: fonts.body, color: COLOR.navy });
  y -= 30;
  page.drawText(input.address, { x: MARGIN, y, size: 16, font: fonts.bold, color: COLOR.ink });
  y -= 20;
  page.drawText(`${input.suburb}, ${input.region}`, { x: MARGIN, y, size: 11, font: fonts.body, color: COLOR.grey });
  y -= 18;
  page.drawText(`${input.periodStartLabel} — ${input.periodEndLabel}`, {
    x: MARGIN,
    y,
    size: 11,
    font: fonts.body,
    color: COLOR.grey,
  });

  const details: [string, string][] = [
    ["Vendor", input.vendorName ?? "—"],
    ["Salesperson", input.agentName],
    ["Days on market", String(input.daysOnMarket)],
    ["Method of sale", input.saleMethod ?? "—"],
  ];
  const colWidth = (PAGE_WIDTH - MARGIN * 2) / 2;
  let dy = y - 34;
  details.forEach(([label, value], i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = MARGIN + col * colWidth;
    const rowY = dy - row * 34;
    page.drawText(label.toUpperCase(), { x, y: rowY, size: 8.5, font: fonts.bold, color: COLOR.greyLight });
    page.drawText(value, { x, y: rowY - 14, size: 12, font: fonts.body, color: COLOR.ink });
  });

  if (input.listingUrl) {
    page.drawText(input.listingUrl, {
      x: MARGIN,
      y: 46,
      size: 10,
      font: fonts.bold,
      color: COLOR.navy,
    });
  }

  footer(page, fonts);
}

function drawPhotoPlaceholder(
  page: PDFPage,
  fonts: { body: PDFFont; bold: PDFFont },
  x: number,
  y: number,
  w: number,
  h: number
) {
  page.drawRectangle({ x, y, width: w, height: h, color: COLOR.photoPlaceholder });
  const label = "No photo uploaded";
  const size = 13;
  const tw = fonts.body.widthOfTextAtSize(label, size);
  page.drawText(label, { x: x + (w - tw) / 2, y: y + h / 2, size, font: fonts.body, color: COLOR.white });
}

function drawCampaignOverviewPage(doc: PDFDocument, fonts: { body: PDFFont; bold: PDFFont }, input: VendorReportInput) {
  const page = newPage(doc);
  let y = PAGE_HEIGHT - 70;

  page.drawText("Campaign overview", { x: MARGIN, y, size: 22, font: fonts.body, color: COLOR.navy });
  y -= 18;
  page.drawText(input.reportDateLabel, { x: MARGIN, y, size: 10, font: fonts.body, color: COLOR.greyLight });
  y -= 40;

  const firstName = (input.vendorName ?? "").trim().split(/\s+/)[0] || "there";
  page.drawText(`Hi ${firstName},`, { x: MARGIN, y, size: 12, font: fonts.body, color: COLOR.ink });
  y -= 26;

  const maxWidth = PAGE_WIDTH - MARGIN * 2;
  const paragraphs = input.campaignNote.split(/\n+/).filter((p) => p.trim().length > 0);
  for (const para of paragraphs) {
    const lines = wrapText(para, fonts.body, 11, maxWidth);
    for (const line of lines) {
      page.drawText(line, { x: MARGIN, y, size: 11, font: fonts.body, color: COLOR.ink });
      y -= 16;
    }
    y -= 10;
  }

  y -= 10;
  page.drawText("Kind regards,", { x: MARGIN, y, size: 11, font: fonts.body, color: COLOR.ink });
  y -= 16;
  page.drawText(input.agentName, { x: MARGIN, y, size: 11, font: fonts.bold, color: COLOR.ink });

  // Signature block, anchored to the bottom of the page.
  const sigY = 130;
  const circleR = 26;
  const circleX = MARGIN + circleR;
  const circleY = sigY + circleR - 6;
  page.drawCircle({ x: circleX, y: circleY, size: circleR, color: COLOR.navy });
  const initials = initialsOf(input.agentName);
  const initialsSize = 18;
  const iw = fonts.bold.widthOfTextAtSize(initials, initialsSize);
  page.drawText(initials, {
    x: circleX - iw / 2,
    y: circleY - initialsSize / 2 + 4,
    size: initialsSize,
    font: fonts.bold,
    color: COLOR.white,
  });

  const textX = MARGIN + circleR * 2 + 16;
  let sy = sigY + 30;
  page.drawText(input.agentName, { x: textX, y: sy, size: 12, font: fonts.bold, color: COLOR.ink });
  sy -= 15;
  page.drawText(`${input.agentPhone}  ·  ${input.agentEmail}`, {
    x: textX,
    y: sy,
    size: 9.5,
    font: fonts.body,
    color: COLOR.grey,
  });
  sy -= 15;
  page.drawText("BAYLEYS FRANKTON, LICENSED UNDER THE REA ACT 2008", {
    x: textX,
    y: sy,
    size: 8,
    font: fonts.bold,
    color: COLOR.greyLight,
  });

  footer(page, fonts);
}

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
}

function drawEnquiryLogPages(doc: PDFDocument, fonts: { body: PDFFont; bold: PDFFont }, input: VendorReportInput) {
  const buckets: { key: EnquiryRow["interest_status"]; label: string }[] = [
    { key: "interested", label: "Interested" },
    { key: "unsure", label: "Awaiting feedback / not sure" },
    { key: "not_interested", label: "Not interested" },
  ];

  const nonEmpty = buckets
    .map((b) => ({ ...b, rows: input.enquiries.filter((e) => e.interest_status === b.key) }))
    .filter((b) => b.rows.length > 0);

  if (nonEmpty.length === 0) {
    const page = newPage(doc);
    page.drawText("Enquiry & feedback log", { x: MARGIN, y: PAGE_HEIGHT - 70, size: 20, font: fonts.body, color: COLOR.navy });
    page.drawText("No enquiries recorded for this reporting period yet.", {
      x: MARGIN,
      y: PAGE_HEIGHT - 110,
      size: 11,
      font: fonts.body,
      color: COLOR.grey,
    });
    footer(page, fonts);
    return;
  }

  const cols = [
    { label: "Date", width: 52 },
    { label: "Name", width: 90 },
    { label: "Source", width: 65 },
    { label: "Comment", width: 145 },
    { label: "Price feedback", width: 85 },
    { label: "Interest", width: 40 },
    { label: "Inspected", width: 40 },
  ];
  const tableWidth = cols.reduce((s, c) => s + c.width, 0);

  let page = newPage(doc);
  let y = PAGE_HEIGHT - 70;
  page.drawText("Enquiry & feedback log", { x: MARGIN, y, size: 20, font: fonts.body, color: COLOR.navy });
  y -= 34;
  footer(page, fonts);

  const bottomLimit = 60;

  const ensureSpace = (needed: number) => {
    if (y - needed < bottomLimit) {
      page = newPage(doc);
      y = PAGE_HEIGHT - 60;
      footer(page, fonts);
    }
  };

  const drawTableHeader = () => {
    ensureSpace(24);
    let x = MARGIN;
    page.drawRectangle({ x: MARGIN, y: y - 16, width: tableWidth, height: 18, color: COLOR.band });
    for (const col of cols) {
      page.drawText(col.label.toUpperCase(), { x: x + 4, y: y - 11, size: 7.5, font: fonts.bold, color: COLOR.grey });
      x += col.width;
    }
    y -= 22;
  };

  for (const bucket of nonEmpty) {
    ensureSpace(40);
    page.drawText(bucket.label, { x: MARGIN, y, size: 12.5, font: fonts.bold, color: COLOR.ink });
    y -= 18;
    drawTableHeader();

    for (const row of bucket.rows) {
      const commentLines = wrapText(row.comment ?? "—", fonts.body, 8.5, cols[3].width - 8);
      const nameLines = wrapText(row.name, fonts.body, 8.5, cols[1].width - 8);
      const lineCount = Math.max(commentLines.length, nameLines.length, 1);
      const rowHeight = lineCount * 11 + 6;

      ensureSpace(rowHeight);

      let x = MARGIN;
      const topY = y;
      page.drawText(formatDateLabel(row.contact_date), { x: x + 4, y: topY - 9, size: 8.5, font: fonts.body, color: COLOR.ink });
      x += cols[0].width;

      nameLines.forEach((line, i) => {
        page.drawText(line, { x: x + 4, y: topY - 9 - i * 11, size: 8.5, font: fonts.bold, color: COLOR.ink });
      });
      x += cols[1].width;

      page.drawText(truncate(row.source ?? "—", fonts.body, 8.5, cols[2].width - 8), {
        x: x + 4,
        y: topY - 9,
        size: 8.5,
        font: fonts.body,
        color: COLOR.grey,
      });
      x += cols[2].width;

      commentLines.forEach((line, i) => {
        page.drawText(line, { x: x + 4, y: topY - 9 - i * 11, size: 8.5, font: fonts.body, color: COLOR.grey });
      });
      x += cols[3].width;

      page.drawText(truncate(row.price_feedback ?? "—", fonts.body, 8.5, cols[4].width - 8), {
        x: x + 4,
        y: topY - 9,
        size: 8.5,
        font: fonts.body,
        color: COLOR.grey,
      });
      x += cols[4].width;

      drawInterestMark(page, fonts, x + cols[5].width / 2, topY - 9, row.interest_status);
      x += cols[5].width;

      if (row.inspected) {
        drawCheckMark(page, x + cols[6].width / 2, topY - 6, COLOR.green);
      }

      page.drawLine({
        start: { x: MARGIN, y: y - rowHeight + 4 },
        end: { x: MARGIN + tableWidth, y: y - rowHeight + 4 },
        thickness: 0.5,
        color: COLOR.hairline,
      });

      y -= rowHeight;
    }
    y -= 20;
  }
}

function drawInterestMark(page: PDFPage, fonts: { body: PDFFont; bold: PDFFont }, cx: number, textY: number, status: EnquiryRow["interest_status"]) {
  if (status === "interested") {
    drawCheckMark(page, cx, textY + 3, COLOR.green);
  } else if (status === "not_interested") {
    drawCrossMark(page, cx, textY + 3, COLOR.red);
  } else {
    page.drawText("?", { x: cx - 3, y: textY, size: 9, font: fonts.bold, color: COLOR.greyLight });
  }
}

function drawCheckMark(page: PDFPage, cx: number, cy: number, color: Color) {
  page.drawLine({ start: { x: cx - 4, y: cy }, end: { x: cx - 1.3, y: cy - 3 }, thickness: 1.4, color });
  page.drawLine({ start: { x: cx - 1.3, y: cy - 3 }, end: { x: cx + 4, y: cy + 4 }, thickness: 1.4, color });
}

function drawCrossMark(page: PDFPage, cx: number, cy: number, color: Color) {
  page.drawLine({ start: { x: cx - 3.2, y: cy - 3.2 }, end: { x: cx + 3.2, y: cy + 3.2 }, thickness: 1.4, color });
  page.drawLine({ start: { x: cx - 3.2, y: cy + 3.2 }, end: { x: cx + 3.2, y: cy - 3.2 }, thickness: 1.4, color });
}

function truncate(text: string, font: PDFFont, size: number, maxWidth: number) {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;
  let result = text;
  while (result.length > 1 && font.widthOfTextAtSize(`${result}…`, size) > maxWidth) result = result.slice(0, -1);
  return `${result}…`;
}

function formatDateLabel(dayKey: string) {
  return new Date(`${dayKey}T00:00:00Z`).toLocaleDateString("en-NZ", {
    timeZone: "Pacific/Auckland",
    day: "numeric",
    month: "short",
  });
}

function drawAttendancePage(doc: PDFDocument, fonts: { body: PDFFont; bold: PDFFont }, input: VendorReportInput) {
  const page = newPage(doc);
  let y = PAGE_HEIGHT - 70;
  page.drawText("Attendance & buyer engagement", { x: MARGIN, y, size: 20, font: fonts.body, color: COLOR.navy });
  y -= 50;

  const { totalGroups, localGroups, outOfAreaGroups, tierCounts } = input.attendance;

  page.drawText(String(totalGroups), { x: MARGIN, y, size: 40, font: fonts.body, color: COLOR.navy });
  page.drawText("TOTAL GROUPS THROUGH", { x: MARGIN, y: y - 16, size: 8.5, font: fonts.bold, color: COLOR.greyLight });

  const localPct = totalGroups ? Math.round((localGroups / totalGroups) * 100) : 0;
  const col2X = MARGIN + 180;
  page.drawText(`${localPct}%`, { x: col2X, y, size: 40, font: fonts.body, color: COLOR.navy });
  page.drawText(`LOCAL BUYERS (${localGroups} OF ${totalGroups})`, {
    x: col2X,
    y: y - 16,
    size: 8.5,
    font: fonts.bold,
    color: COLOR.greyLight,
  });

  const col3X = MARGIN + 360;
  page.drawText(String(outOfAreaGroups), { x: col3X, y, size: 40, font: fonts.body, color: COLOR.navy });
  page.drawText("OUT-OF-AREA BUYERS", { x: col3X, y: y - 16, size: 8.5, font: fonts.bold, color: COLOR.greyLight });

  y -= 80;
  page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_WIDTH - MARGIN, y }, thickness: 1, color: COLOR.hairline });
  y -= 40;

  page.drawText("Buyer interest tiers", { x: MARGIN, y, size: 13, font: fonts.bold, color: COLOR.ink });
  y -= 30;

  const tiers: (keyof typeof tierCounts)[] = ["AAA", "AA", "A", "B", "C"];
  const maxCount = Math.max(...tiers.map((t) => tierCounts[t]), 1);
  const maxBarWidth = 320;

  for (const tier of tiers) {
    const count = tierCounts[tier];
    const barWidth = count > 0 ? Math.max((count / maxCount) * maxBarWidth, 6) : 0;
    page.drawRectangle({ x: MARGIN, y: y - 4, width: 32, height: 16, color: COLOR.navy });
    const tw = fonts.bold.widthOfTextAtSize(tier, 9);
    page.drawText(tier, { x: MARGIN + 16 - tw / 2, y: y - 1, size: 9, font: fonts.bold, color: COLOR.white });
    page.drawRectangle({ x: MARGIN + 48, y: y - 4, width: barWidth, height: 16, color: COLOR.band });
    page.drawText(String(count), { x: MARGIN + 48 + barWidth + 8, y: y - 1, size: 10, font: fonts.bold, color: COLOR.ink });
    y -= 26;
  }

  footer(page, fonts);
}

function drawMarketingActivityPage(doc: PDFDocument, fonts: { body: PDFFont; bold: PDFFont }, input: VendorReportInput) {
  const page = newPage(doc);
  let y = PAGE_HEIGHT - 70;
  page.drawText("Marketing activity", { x: MARGIN, y, size: 20, font: fonts.body, color: COLOR.navy });
  y -= 40;

  const maxWidth = PAGE_WIDTH - MARGIN * 2;
  const intro =
    input.portalFiles.length > 0
      ? "Portal performance statistics for this campaign — Bayleys, realestate.co.nz, TradeMe, OneRoof and homes.co.nz — are reproduced exactly as exported from each platform on the pages that follow."
      : "No portal export files were attached to this report. Upload each platform's exported performance PDF from the Vendor report tab to have it appended here.";
  for (const line of wrapText(intro, fonts.body, 11, maxWidth)) {
    page.drawText(line, { x: MARGIN, y, size: 11, font: fonts.body, color: COLOR.grey });
    y -= 16;
  }

  footer(page, fonts);
}

function drawBackCoverPage(doc: PDFDocument, fonts: { body: PDFFont; bold: PDFFont }, input: VendorReportInput) {
  const page = newPage(doc);
  page.drawRectangle({ x: 0, y: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT, color: COLOR.navy });

  let y = PAGE_HEIGHT - 140;
  page.drawText("Bayleys Frankton", { x: MARGIN, y, size: 24, font: fonts.body, color: COLOR.white });
  y -= 34;

  const lines = [input.agentName, input.agentPhone, input.agentEmail, "bayleys.co.nz"];
  for (const line of lines) {
    page.drawText(line, { x: MARGIN, y, size: 11, font: fonts.body, color: rgbLight() });
    y -= 18;
  }

  y -= 40;
  page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_WIDTH - MARGIN, y }, thickness: 0.5, color: rgbLight() });
  y -= 30;

  const disclaimer =
    "This report has been prepared from information collected during the marketing campaign to date and is provided for the vendor's information only. Attendance, enquiry and feedback figures are drawn from the agency's own records; third-party marketing platform statistics included in this report are reproduced as supplied by each platform. While every care has been taken in its preparation, no warranty is given as to the accuracy or completeness of this report and no liability is accepted for any error or omission.";
  const maxWidth = PAGE_WIDTH - MARGIN * 2;
  for (const line of wrapText(disclaimer, fonts.body, 8.5, maxWidth)) {
    page.drawText(line, { x: MARGIN, y, size: 8.5, font: fonts.body, color: rgbLight() });
    y -= 13;
  }

  page.drawText("ALTOGETHER BETTER", { x: MARGIN, y: 40, size: 8, font: fonts.bold, color: COLOR.white });
}

function rgbLight() {
  return COLOR.band;
}
