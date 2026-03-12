import "dotenv/config";
import express from "express";
import http from "http";
import cors from "cors";
import { Server as SocketIOServer } from "socket.io";

import { errorHandler, notFoundHandler } from "./lib/errors";
import { authRouter } from "./routes/auth";
import { locationsRouter } from "./routes/locations";
import { skillsRouter } from "./routes/skills";
import { shiftsRouter } from "./routes/shifts";
import { coverageRouter } from "./routes/coverage";
import { analyticsRouter } from "./routes/analytics";
import { notificationsRouter } from "./routes/notifications";
import { auditRouter } from "./routes/audit";
import { availabilityRouter } from "./routes/availability";
import { usersRouter } from "./routes/users";
import { setSocketIO } from "./services/notifications";

const app = express();
const server = http.createServer(app);

const io = new SocketIOServer(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use("/auth", authRouter);
app.use("/locations", locationsRouter);
app.use("/skills", skillsRouter);
app.use("/users", usersRouter);
app.use("/shifts", shiftsRouter);
app.use("/coverage", coverageRouter);
app.use("/analytics", analyticsRouter);
app.use("/notifications", notificationsRouter);
app.use("/audit", auditRouter);
app.use("/availability", availabilityRouter);

app.use(notFoundHandler);
app.use(errorHandler);

setSocketIO(io);

io.on('connection', (socket) => {
  console.log('Client connected', socket.id);

  // Authenticate socket and join user specific room
  socket.on('join', (userId: string) => {
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