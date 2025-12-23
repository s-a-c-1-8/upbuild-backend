// const express = require("express");
// const dotenv = require("dotenv");
// const cors = require("cors");
// const connectDB = require("./config/db");
// const path = require("path");
// // Routes
// const superAdminRoutes = require("./routes/superAdmin/superAdminRoutes");
// const propertyTypeRoutes = require("./routes/superAdmin/propertyTypeRoutes");
// const amenityRoutes = require("./routes/superAdmin/amenityRoutes");
// const planRoutes = require("./routes/superAdmin/planRoutes");
// const permissionsRoutes = require("./routes/superAdmin/permissionRoutes");
// const roleRoutes = require("./routes/superAdmin/roleRoutes");
// const subAdminRoutes = require("./routes/subAdmin/subAdminRoutes");
// const apartmentRoutes = require("./routes/apartment/apartmentRoutes");
// const superSubAdminsLoginRoutes = require("./routes/superSubAdminsLoginRoutes");
// const userRoutes = require("./routes/user/userRoutes");
// const apartmentPermissionRoutes = require("./routes/apartment/apartmentPermissionRoutes");
// const ApartmentRoleRoutes = require("./routes/apartment/ApartmentRoleRoutes");
// const BuilerNameRoutes = require("./routes/superAdmin/builderNameRoutes");
// const serviceRoutes = require("./routes/superAdmin/serviceRoutes");
// const apartmentUserRoutes = require("./routes/apartment/apartemntEditUser");
// const faltRoutes = require("./routes/flat/flatRoutes");
// const addStaffRoutes = require("./routes/apartment/addStaffRoutes");
// const visitorRoutes = require("./routes/flat/visitorRoutes");
// const otpRoutes = require("./routes/user/otpRoutes");
// const apartmentFetchNewUser = require("./routes/apartment/apartmentFetchForNewUser");
// const agencyRoutes = require("./routes/apartment/agencyRoutes");
// const complaintRoutes = require("./routes/flat/complaintRoutes");
// const maintenanceExpenseRoutes = require("./routes/apartment/expenseRoutes");
// const maintenanceRoute = require("./routes/flat/maintenanceRoute");
// const auditLogRoutes = require("./routes/auditLogRoutes");
// const otpSettingsRoutes = require("./routes/superAdmin/appSettingsRoutes");
// // const verificationRoutes = require('./routes/apartment/verificationRoutes');

// dotenv.config();
// const app = express();
// const PORT = process.env.PORT || 5000;

// app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// // Connect to DB
// connectDB();

// // Middleware
// app.use(cors());

// // ❌ DO NOT use `express.json()` globally, because it breaks multer
// // ✅ Instead, apply json parser *only* for non-multipart routes inside the specific routers
// // app.use(express.json());
// // ✅ Use JSON parser only if Content-Type is JSON
// app.use((req, res, next) => {
//   const contentType = req.headers["content-type"] || "";
//   if (contentType.includes("application/json")) {
//     express.json()(req, res, next);
//   } else {
//     next();
//   }
// });

// app.use(express.static("public"));

// // Routes
// app.use("/api", superAdminRoutes);
// app.use("/api", propertyTypeRoutes);
// app.use("/api", amenityRoutes);
// app.use("/api", planRoutes);
// app.use("/api", permissionsRoutes);
// app.use("/api", roleRoutes);
// app.use("/api", subAdminRoutes);
// app.use("/api", apartmentRoutes);
// app.use("/api", superSubAdminsLoginRoutes);
// app.use("/api", userRoutes);
// app.use("/api", apartmentPermissionRoutes);
// app.use("/api", ApartmentRoleRoutes);
// app.use("/api", BuilerNameRoutes);
// app.use("/api", serviceRoutes);
// app.use("/api", apartmentUserRoutes);
// app.use("/api", faltRoutes);
// app.use("/api", addStaffRoutes);
// app.use("/api", visitorRoutes);
// app.use("/api", otpRoutes);
// app.use("/api", apartmentFetchNewUser);
// app.use("/api", agencyRoutes);
// app.use("/api", complaintRoutes);
// app.use("/api", maintenanceExpenseRoutes);
// app.use("/api", maintenanceRoute);
// app.use("/api", auditLogRoutes);
// app.use("/api", otpSettingsRoutes);
// // app.use('/api', verificationRoutes);

// // Test
// // app.get("/", (req, res) => {
// //   res.send("Hello from Node.js backend!");
// // });

// app.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });

const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./config/db");
const path = require("path");
const http = require("http"); // 🧩 Added for socket.io
const { initSocket } = require("./socket");

// Load env variables
dotenv.config();

// Initialize express and server
const app = express();
const server = http.createServer(app); // 👈 Use this instead of app.listen()
const PORT = process.env.PORT || 5000;
const HOST = "0.0.0.0";
// Connect DB
connectDB();

// Middleware
app.use(cors());

// Use JSON parser only for JSON requests
app.use((req, res, next) => {
  const contentType = req.headers["content-type"] || "";
  if (contentType.includes("application/json")) {
    express.json()(req, res, next);
  } else {
    next();
  }
});

require("./controller/subAdmin/clearOldSubAdminPasswords");

app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(express.static("public"));

// Routes
app.use("/api", require("./routes/superAdmin/superAdminRoutes"));
app.use("/api", require("./routes/superAdmin/propertyTypeRoutes"));
app.use("/api", require("./routes/superAdmin/amenityRoutes"));
app.use("/api", require("./routes/superAdmin/planRoutes"));
app.use("/api", require("./routes/superAdmin/permissionRoutes"));
app.use("/api", require("./routes/superAdmin/roleRoutes"));
app.use("/api", require("./routes/superSubAdminsLoginRoutes"));
app.use("/api", require("./routes/superAdmin/builderNameRoutes"));
app.use("/api", require("./routes/superAdmin/serviceRoutes"));
app.use("/api", require("./routes/superAdmin/appSettingsRoutes"));
app.use("/api", require("./routes/subAdmin/subAdminRoutes"));
app.use("/api", require("./routes/superAdmin/apartmentPermisson"));
app.use("/api", require("./routes/user/userRoutes"));
app.use("/api", require("./routes/user/otpRoutes"));
app.use("/api", require("./routes/user/savePushToken"));
app.use("/api", require("./routes/apartment/apartmentRoutes"));
app.use("/api", require("./routes/apartment/apartmentPermissionRoutes"));
app.use("/api", require("./routes/apartment/apartmentRoleRoutes"));
app.use("/api", require("./routes/apartment/apartemntEditUser"));
app.use("/api", require("./routes/apartment/addMembersBasedOnRoles"));
app.use("/api", require("./routes/apartment/agencyRoutes"));
app.use("/api", require("./routes/apartment/accountRoutes"));
app.use("/api", require("./routes/apartment/apartmentFetchForNewUser"));
app.use("/api", require("./routes/flat/expenseRoutes"));
app.use("/api", require("./routes/flat/flatRoutes"));
app.use("/api", require("./routes/flat/visitorRoutes"));
app.use("/api", require("./routes/flat/visitorBulkRoutes"));
app.use("/api", require("./routes/flat/complaintRoutes"));
app.use("/api", require("./routes/flat/maintenanceRoute"));
app.use("/api", require("./routes/flat/maintenanceMonthlyRoutes"));
app.use("/api", require("./routes/flat/maintenanceSettingsRoutes"));
app.use("/api", require("./routes/flat/boardMembersRoutes"));
app.use("/api", require("./routes/auditLogRoutes"));
app.use("/api", require("./routes/user/notificationRoutes"));
app.use("/api", require("./routes/apartment/otpRoutes"));
app.use("/api", require("./routes/apartment/amenitiesRoutes"));
app.use("/api", require("./routes/flat/bookingAmenitiesRoutes"));
app.use("/api", require("./routes/apartment/communityPostRoutes"));
app.use("/api", require("./routes/apartment/communityPollRoutes"));
app.use("/api", require("./routes/apartment/communityNoticeRoutes"));
app.use("/api", require("./routes/superAdmin/apartmentAdminChange"));
// app.use("/api", require("./routes/apartment/verificationRoutes"));

// Initialize socket.io
initSocket(server); // 🔌 Call your socket setup with the HTTP server

// Start server
server.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
