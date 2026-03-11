import { prisma } from "../db/prisma";

export async function createAuditLog(args: {
    actorUserId?: string;
    entityType: string;
    entityId: string;
    action: string;
    before?: any;
    after?: any;
    reason?: string | null;
}) {
    return prisma.auditLog.create({
        data: {
            actorUserId: args.actorUserId ?? null,
            entityType: args.entityType,
            entityId: args.entityId,
            action: args.action,
            before: args.before ?? null,
            after: args.after ?? null,
            reason: args.reason ?? null,
        },
    });
}
