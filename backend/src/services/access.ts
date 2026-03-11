import { prisma } from "../db/prisma";
import { ApiError } from "../lib/errors";

export async function assertManagerHasLocationAccess(args: { managerUserId: string; locationId: string }) {
  const link = await prisma.userLocation.findUnique({
    where: { userId_locationId: { userId: args.managerUserId, locationId: args.locationId } },
    select: { isManager: true },
  });
  if (!link?.isManager) {
    throw new ApiError({ status: 403, code: "FORBIDDEN", message: "You do not have access to this location" });
  }
}

