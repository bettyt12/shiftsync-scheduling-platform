import { prisma } from "../db/prisma";
import { type NotificationStatus } from "@prisma/client";

// This is a placeholder for the socket.io instance
// In a real app, you might use a singleton or pass it through middleware.
let io: any = null;

export function setSocketIO(socketIO: any) {
    io = socketIO;
}

export async function createNotification(args: {
    userId: string;
    type: string;
    payload: any;
}) {
    const notification = await prisma.notification.create({
        data: {
            userId: args.userId,
            type: args.type,
            payload: args.payload,
            status: "UNREAD",
        },
    });

    if (io) {
        // Notify the specific user via their room
        io.to(`user:${args.userId}`).emit("notification", notification);
    }

    return notification;
}

export async function notifyManagers(args: {
    locationId: string;
    type: string;
    payload: any;
}) {
    const managers = await prisma.userLocation.findMany({
        where: { locationId: args.locationId, isManager: true },
        select: { userId: true },
    });

    for (const m of managers) {
        await createNotification({
            userId: m.userId,
            type: args.type,
            payload: args.payload,
        });
    }
}
