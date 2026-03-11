"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const cors_1 = __importDefault(require("cors"));
const socket_io_1 = require("socket.io");
const errors_1 = require("./lib/errors");
const auth_1 = require("./routes/auth");
const locations_1 = require("./routes/locations");
const skills_1 = require("./routes/skills");
const shifts_1 = require("./routes/shifts");
const coverage_1 = require("./routes/coverage");
const analytics_1 = require("./routes/analytics");
const notifications_1 = require("./routes/notifications");
const audit_1 = require("./routes/audit");
const notifications_2 = require("./services/notifications");
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
    },
});
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
});
app.use("/auth", auth_1.authRouter);
app.use("/locations", locations_1.locationsRouter);
app.use("/skills", skills_1.skillsRouter);
app.use("/shifts", shifts_1.shiftsRouter);
app.use("/coverage", coverage_1.coverageRouter);
app.use("/analytics", analytics_1.analyticsRouter);
app.use("/notifications", notifications_1.notificationsRouter);
app.use("/audit", audit_1.auditRouter);
app.use(errors_1.notFoundHandler);
app.use(errors_1.errorHandler);
(0, notifications_2.setSocketIO)(io);
io.on('connection', (socket) => {
    console.log('Client connected', socket.id);
    // Authenticate socket and join user specific room
    socket.on('join', (userId) => {
        // In production, verify token before joining room
        console.log(`Socket ${socket.id} joining room user:${userId}`);
        socket.join(`user:${userId}`);
    });
    socket.on('disconnect', () => {
        console.log('Client disconnected', socket.id);
    });
});
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
//# sourceMappingURL=index.js.map