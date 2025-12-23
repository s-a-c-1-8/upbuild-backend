const mongoose = require("mongoose");
const FlatBulkVisitor = require("../../../../model/flat/visitorBulk");
const Apartment = require("../../../../model/apartment/apartmentModel");
const puppeteer = require("puppeteer");
const logAction = require("../../../../utils/logAction"); // ✅ Import logAction

exports.exportBulkVisitorsPDF = async (req, res) => {
  try {
    const { visitorIds = [], fromDate, toDate, apartmentId } = req.body;

    if (!apartmentId) {
      return res.status(400).json({ message: "Apartment ID is required" });
    }

    let query = { apartmentId };

    if (Array.isArray(visitorIds) && visitorIds.length > 0) {
      query._id = { $in: visitorIds };
    }

    if (fromDate && toDate) {
      query.createdAt = {
        $gte: new Date(fromDate),
        $lte: new Date(new Date(toDate).setHours(23, 59, 59, 999)),
      };
    }

    const entries = await FlatBulkVisitor.find(query)
      .populate("flatId", "flatName blockName")
      .sort({ createdAt: -1 });

    if (entries.length === 0) {
      return res.status(404).json({ message: "No bulk visitors found" });
    }

    const apartment = await Apartment.findById(apartmentId);
    const apartmentName = apartment?.name || "Apartment";
    const exportedOn = new Date().toLocaleString();
    const logoUrl = `${
      process.env.BACKEND_URL || "http://localhost:5000"
    }/static/LOGO.png`;

    const rows = entries
      .map((entry, index) => {
        const flat = entry.flatId || {};
        const dateText = entry.isMultipleDays
          ? `${new Date(entry.fromDate).toLocaleDateString()} - ${new Date(
              entry.toDate
            ).toLocaleDateString()}`
          : new Date(entry.visitDate).toLocaleDateString();

        return `
        <tr>
          <td style="text-align:center;font-size:10px;">${index + 1}</td>
          <td style="font-size:10px;">${
            entry.isForEntireApartment
              ? "Entire Apartment"
              : `${flat.flatName || "—"} - ${flat.blockName || "—"}`
          }</td>
          <td style="font-size:10px;">${entry.eventPurpose}</td>
          <td style="text-align:center;font-size:10px;">${
            entry.expectedCount
          }</td>
          <td style="font-size:10px;">${
            entry.isMultipleDays ? "Multi-Day" : "Single Day"
          }</td>
          <td style="font-size:10px;">${dateText}</td>
          <td style="font-size:10px;">${entry.fromTime} - ${entry.toTime}</td>
          <td style="font-size:10px;">${entry.notes || "—"}</td>
        </tr>
      `;
      })
      .join("");

    const html = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; font-size: 11px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #ccc; padding: 6px; text-align: left; vertical-align: top; }
            th { background-color: #f4f4f4; }
            .logo { margin-bottom: 10px; }
          </style>
        </head>
        <body>
          <div class="logo"><img src="${logoUrl}" height="40" /></div>
          <h2>${apartmentName} - Bulk Visitor Export</h2>
          <p>Exported on: ${exportedOn}</p>

          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Flat / Block</th>
                <th>Event</th>
                <th>Count</th>
                <th>Type</th>
                <th>Date(s)</th>
                <th>Time</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </body>
      </html>
    `;

    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });

    const buffer = await page.pdf({ format: "A4", printBackground: true });
    await browser.close();

    // 🪵 Log the action
    await logAction({
      req,
      action: "EXPORT_BULK_VISITORS_PDF",
      description: `Exported ${entries.length} bulk visitor entry(ies) to PDF`,
      metadata: {
        apartmentId,
        apartmentName,
        count: entries.length,
        filteredByVisitorIds: visitorIds.length > 0,
        fromDate: fromDate || null,
        toDate: toDate || null,
      },
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=bulk_visitors.pdf"
    );
    res.send(buffer);
  } catch (err) {
    console.error("PDF Export Error:", err);
    res.status(500).json({ message: "Failed to export PDF" });
  }
};
