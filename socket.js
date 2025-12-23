const { Server } = require("socket.io");
const Flat = require("./model/flat/flatModel");
const UserRoleAssignment = require("./model/user/userRoleAssignment");

const userSocketMap = new Map();
let ioInstance = null;

function getKey({ userId, apartmentId, userType }) {
  return `${userId}_${apartmentId}_${userType}`;
}

function getFlatKey({ apartmentId, flatId }) {
  return `${apartmentId}_${flatId}`;
}

function initSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
    pingInterval: 25000, // send ping every 25s
    pingTimeout: 60000, // disconnect if no pong in 60s
  });

  ioInstance = io;

  io.on("connection", (socket) => {
    console.log("✅ Socket connected:", socket.id);

    socket.on("register-user", ({ userId, apartmentId, userType }) => {
      const key = getKey({ userId, apartmentId, userType });
      userSocketMap.set(key, socket.id);
    });

    socket.on("call-user", ({ to, from, offer }) => {
      const target = userSocketMap.get(getKey(to));
      if (target) io.to(target).emit("offer", { from, offer });
    });

    socket.on("answer", ({ to, answer }) => {
      const target = userSocketMap.get(getKey(to));
      if (target) io.to(target).emit("answer", { answer });
    });

    socket.on("ice-candidate", ({ to, candidate }) => {
      const target = userSocketMap.get(getKey(to));
      if (target) io.to(target).emit("ice-candidate", { candidate });
    });

    socket.on("register-flat", async ({ apartmentId, flatId, userId }, ack) => {
      try {
        const flat = await Flat.findById(flatId).lean();
        if (!flat) return ack?.({ success: false, reason: "Flat not found" });

        const assignment = await UserRoleAssignment.findOne({
          user: userId,
          apartment: apartmentId,
          flat: flatId,
          active: true,
        }).lean();

        if (!assignment)
          return ack?.({ success: false, reason: "No active role assignment" });

        const validTypes = flat.ownerStaying
          ? ["owner", "owner_occupant"]
          : ["tenant", "tenant_occupant"];

        if (!validTypes.includes(assignment.relationshipType)) {
          return ack?.({
            success: false,
            reason: `Role ${assignment.relationshipType} not allowed`,
          });
        }

        const flatKey = getFlatKey({ apartmentId, flatId });
        socket.join(flatKey);
        return ack?.({ success: true, flatKey });
      } catch (err) {
        console.error("❌ Error in register-flat:", err);
        return ack?.({ success: false, reason: "Server error" });
      }
    });

    socket.on("new-visitor", ({ apartmentId, flatId, visitorLogId }) => {
      const flatKey = getFlatKey({ apartmentId, flatId });
      io.to(flatKey).emit("new-visitor", { visitorLogId, flatId, apartmentId });
    });

    socket.on(
      "occupant-response",
      ({ apartmentId, flatId, visitorLogId, response }) => {
        const flatKey = getFlatKey({ apartmentId, flatId });
        io.to(flatKey).emit("visitor-response-recorded", {
          visitorLogId,
          response,
        });
      }
    );

    socket.on("new-bulk-visitor", ({ apartmentId, flatId, visitorLogId }) => {
      const flatKey = getFlatKey({ apartmentId, flatId });
      io.to(flatKey).emit("new-bulk-visitor", {
        visitorLogId,
        flatId,
        apartmentId,
      });
    });

    socket.on(
      "bulk-occupant-response",
      ({ apartmentId, flatId, visitorId, response }) => {
        const flatKey = getFlatKey({ apartmentId, flatId });
        io.to(flatKey).emit("bulk-visitor-response", { visitorId, response });
      }
    );

    socket.on("disconnect", () => {
      for (const [key, id] of userSocketMap.entries()) {
        if (id === socket.id) {
          userSocketMap.delete(key);
          break;
        }
      }
    });
  });

  return io;
}

function getIO() {
  return ioInstance;
}

module.exports = {
  initSocket,
  getIO,
  getKey,
  userSocketMap,
};
