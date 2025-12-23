const mongoose = require("mongoose");
const VisitorLog = require("../../../model/flat/visitorLogModel");
const UserRoleAssignment = require("../../../model/user/userRoleAssignment");
const puppeteer = require("puppeteer");
const logAction = require("../../../utils/logAction");

exports.exportVisitorsPDF = async (req, res) => {
  try {
    const { visitorIds, fromDate, toDate } = req.body;

    if ((!visitorIds || !Array.isArray(visitorIds) || visitorIds.length === 0) && (!fromDate || !toDate)) {
      return res.status(400).json({ message: "No visitorIds or date range provided." });
    }

    const query = {};
    if (visitorIds?.length) {
      query._id = { $in: visitorIds };
    }
    if (fromDate && toDate) {
      query.createdAt = {
        $gte: new Date(fromDate),
        $lte: new Date(new Date(toDate).setHours(23, 59, 59, 999)),
      };
    }

    const logs = await VisitorLog.find(query)
      .populate("visitor")
      .populate("flatId")
      .populate("apartment");

    if (!logs.length) {
      return res.status(404).json({ message: "No visitors found for export." });
    }

    const apartmentId = logs[0]?.apartment?._id;
    const apartmentName = logs[0]?.apartment?.name || "Apartment";
    const exportedOn = new Date().toLocaleString();
    const logoUrl = `${process.env.BACKEND_URL || "http://localhost:5000"}/static/LOGO.png`;

    const flatIds = [...new Set(logs.map((log) => log.flatId?._id?.toString()).filter(Boolean))];

    const assignments = await UserRoleAssignment.find({
      apartment: apartmentId,
      flat: { $in: flatIds },
    }).populate("user", "name contactNumber").lean();

    const flatOccupantsMap = {};
    for (const a of assignments) {
      const flatId = a.flat?.toString();
      if (!flatOccupantsMap[flatId]) flatOccupantsMap[flatId] = [];
      flatOccupantsMap[flatId].push({
        name: a.user?.name || "",
        phone: a.user?.contactNumber || "",
        role: a.relationshipType,
      });
    }

    const rows = logs.map((log, index) => {
      const flat = log.flatId;
      const flatId = flat?._id?.toString();
      const occupants = flatOccupantsMap[flatId] || [];

      const occupant = flat?.ownerStaying
        ? occupants.find((o) => o.role === "owner")
        : occupants.find((o) => o.role === "tenant");

      const occupantName = occupant?.name || "N/A";
      const occupantPhone = occupant?.phone || "N/A";

      const photoUrl = log.visitor?.photo
        ? log.visitor.photo.startsWith("http")
          ? log.visitor.photo
          : `${process.env.BACKEND_URL || "http://localhost:5000/"}${log.visitor.photo.replace(/\\/g, "/")}`
        : "";

      const occupantStatus = log.occupantAcceptStatus || "Pending";

      return `
        <tr>
          <td style="text-align:center; font-size:10px;">${index + 1}</td>
          <td style="text-align:center;">
            ${photoUrl ? `<img src="${photoUrl}" width="40" height="40" style="object-fit:cover;border-radius:4px;margin-bottom:4px;" />` : "N/A"}
            <div style="font-size:9px;">${log.visitorLogId || "N/A"}</div>
          </td>
          <td>
            <div><strong style="font-size:11px;">${log.visitor?.name || "N/A"}</strong></div>
            <div style="font-size:10px;color:#555;">${log.visitor?.phoneNumber || "N/A"}</div>
          </td>
          <td style="font-size:10px;">${flat?.flatName || "N/A"}-${flat?.blockName || "N/A"}</td>
          <td>
            <div><strong style="font-size:11px;">${occupantName}</strong></div>
            <div style="font-size:10px;color:#555;">${occupantPhone}</div>
          </td>
          <td style="font-size:10px;">${log.visitorType || "—"}</td>
          <td style="font-size:10px;">${log.purpose || "—"}</td>
          <td style="font-size:10px;">${log.vehicleNumber || "—"}</td>
          <td style="font-size:10px;">${occupantStatus}</td>
          <td style="font-size:10px;">${log.status}</td>
          <td style="font-size:10px; text-align:center;">
            ${log.clockInTime ? `
              <div>${new Date(log.clockInTime).toLocaleDateString()}</div>
              <div style="color:#555;">${new Date(log.clockInTime).toLocaleTimeString()}</div>` : "—"
            }
          </td>
          <td style="font-size:10px; text-align:center;">
            ${log.clockOutTime ? `
              <div>${new Date(log.clockOutTime).toLocaleDateString()}</div>
              <div style="color:#555;">${new Date(log.clockOutTime).toLocaleTimeString()}</div>` : "—"
            }
          </td>
        </tr>
      `;
    }).join("");

    const htmlContent = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; font-size: 11px; padding: 20px; }
            .logo-top { margin-bottom: 10px; }
            .logo-top img { height: 40px; }
            h2 { font-size: 14px; margin: 8px 0 4px; }
            p { font-size: 10px; margin: 2px 0 10px; }
            table { width: 100%; border-collapse: collapse; margin-top: 8px; }
            th, td { border: 1px solid #ccc; padding: 6px; text-align: left; vertical-align: middle; }
            th { background-color: #f0f0f0; font-size: 11px; }
            img { border: 1px solid #ccc; }
          </style>
        </head>
        <body>
          <div class="logo-top">
            <img src="${logoUrl}" />
          </div>
          <h2>${apartmentName} - Visitor Export Report</h2>
          <p>Exported on: ${exportedOn}</p>
          <table>
            <thead>
              <tr>
                <th>Sl. No</th>
                <th>Photo & Log ID</th>
                <th>Visitor</th>
                <th>Flat</th>
                <th>Occupant</th>
                <th>Visitor Type</th>
                <th>Purpose</th>
                <th>Vehicle No.</th>
                <th>Occupant Status</th>
                <th>Status</th>
                <th>Clock In</th>
                <th>Clock Out</th>
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
    await page.setContent(htmlContent, { waitUntil: "load" });

    const pdfBuffer = await page.pdf({ format: "A4", printBackground: true });
    await browser.close();

    await logAction({
      req,
      action: "EXPORT_VISITORS_PDF",
      description: `Exported ${logs.length} visitor log(s) to PDF`,
      metadata: {
        apartmentId,
        apartmentName,
        count: logs.length,
        visitorIds: visitorIds || [],
        fromDate: fromDate || null,
        toDate: toDate || null,
      },
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=visitors_report.pdf");
    res.send(pdfBuffer);
  } catch (err) {
    console.error("Failed to export visitors to PDF:", err);
    res.status(500).json({ message: "Failed to export visitors to PDF" });
  }
};
