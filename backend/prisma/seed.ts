/// <reference types="node" />
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function minutes(hhmm: string) {
  const [hh, mm] = hhmm.split(":").map((x) => Number(x));
  return hh * 60 + mm;
}

function utcDate(iso: string) {
  // Expecting an ISO string with timezone, but using Z is simplest for seed.
  return new Date(iso);
}

async function main() {
  // Make seed repeatable for local dev (only touch known seed data)
  await prisma.coverageRequest.deleteMany();
  await prisma.shiftAssignment.deleteMany();
  await prisma.shift.deleteMany();
  await prisma.availability.deleteMany({
    where: {
      user: {
        email: { endsWith: "@coastaleats.com" },
      },
    },
  });
  await prisma.userSkill.deleteMany();
  await prisma.userLocation.deleteMany();
  await prisma.notification.deleteMany({
    where: {
      user: {
        email: { endsWith: "@coastaleats.com" },
      },
    },
  });
  await prisma.userNotificationPreference.deleteMany({
    where: {
      user: {
        email: { endsWith: "@coastaleats.com" },
      },
    },
  });
  await prisma.auditLog.deleteMany({
    where: { entityType: "seed" },
  });
  await prisma.skill.deleteMany();
  await prisma.location.deleteMany();
  await prisma.user.deleteMany({
    where: {
      email: { endsWith: "@coastaleats.com" },
    },
  });

  // Locations (4 locations, 2 timezones)
  const locations = await Promise.all([
    prisma.location.upsert({
      where: { id: "loc-nyc" },
      update: {},
      create: { id: "loc-nyc", name: "Coastal Eats — Manhattan", timezone: "America/New_York" },
    }),
    prisma.location.upsert({
      where: { id: "loc-bos" },
      update: {},
      create: { id: "loc-bos", name: "Coastal Eats — Boston", timezone: "America/New_York" },
    }),
    prisma.location.upsert({
      where: { id: "loc-sf" },
      update: {},
      create: { id: "loc-sf", name: "Coastal Eats — San Francisco", timezone: "America/Los_Angeles" },
    }),
    prisma.location.upsert({
      where: { id: "loc-sea" },
      update: {},
      create: { id: "loc-sea", name: "Coastal Eats — Seattle", timezone: "America/Los_Angeles" },
    }),
  ]);

  // Skills
  const skillNames = ["bartender", "line cook", "server", "host"] as const;
  const skills = await Promise.all(
    skillNames.map((name) =>
      prisma.skill.upsert({
        where: { name },
        update: {},
        create: { name },
      }),
    ),
  );
  const skillByName = Object.fromEntries(skills.map((s) => [s.name, s]));

  // Users
  // NOTE: passwordHash is a placeholder for now; we'll replace with real hashing in auth step.
  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: "admin@coastaleats.com" },
      update: { role: "ADMIN", name: "Avery Admin" },
      create: {
        email: "admin@coastaleats.com",
        passwordHash: "dev-password",
        name: "Avery Admin",
        role: "ADMIN",
      },
    }),
    prisma.user.upsert({
      where: { email: "mia.manager@coastaleats.com" },
      update: { role: "MANAGER", name: "Mia Manager" },
      create: {
        email: "mia.manager@coastaleats.com",
        passwordHash: "dev-password",
        name: "Mia Manager",
        role: "MANAGER",
      },
    }),
    prisma.user.upsert({
      where: { email: "noah.manager@coastaleats.com" },
      update: { role: "MANAGER", name: "Noah Manager" },
      create: {
        email: "noah.manager@coastaleats.com",
        passwordHash: "dev-password",
        name: "Noah Manager",
        role: "MANAGER",
      },
    }),
  ]);

  const admin = users[0];
  const mia = users[1];
  const noah = users[2];

  const staffSeed = [
    { email: "sarah.staff@coastaleats.com", name: "Sarah Staff", desiredHoursPerWeek: 30, skills: ["server"], locs: ["loc-nyc", "loc-bos"] },
    { email: "john.staff@coastaleats.com", name: "John Staff", desiredHoursPerWeek: 40, skills: ["bartender"], locs: ["loc-nyc", "loc-sf"] }, // cross-timezone
    { email: "maria.staff@coastaleats.com", name: "Maria Staff", desiredHoursPerWeek: 20, skills: ["host", "server"], locs: ["loc-bos"] },
    { email: "leo.staff@coastaleats.com", name: "Leo Staff", desiredHoursPerWeek: 45, skills: ["line cook"], locs: ["loc-sf", "loc-sea"] },
    { email: "nina.staff@coastaleats.com", name: "Nina Staff", desiredHoursPerWeek: 35, skills: ["server"], locs: ["loc-sea"] },
    { email: "omar.staff@coastaleats.com", name: "Omar Staff", desiredHoursPerWeek: 25, skills: ["bartender", "server"], locs: ["loc-nyc"] },
    { email: "ivy.staff@coastaleats.com", name: "Ivy Staff", desiredHoursPerWeek: 15, skills: ["host"], locs: ["loc-sf"] },
    { email: "ben.staff@coastaleats.com", name: "Ben Staff", desiredHoursPerWeek: 40, skills: ["line cook"], locs: ["loc-bos", "loc-nyc"] },
  ] as const;

  const staff = await Promise.all(
    staffSeed.map((s) =>
      prisma.user.upsert({
        where: { email: s.email },
        update: { role: "STAFF", name: s.name, desiredHoursPerWeek: s.desiredHoursPerWeek },
        create: {
          email: s.email,
          passwordHash: "dev-password",
          name: s.name,
          role: "STAFF",
          desiredHoursPerWeek: s.desiredHoursPerWeek,
        },
      }),
    ),
  );

  // Manager location assignments
  await prisma.userLocation.upsert({
    where: { userId_locationId: { userId: mia.id, locationId: "loc-nyc" } },
    update: { isManager: true },
    create: { userId: mia.id, locationId: "loc-nyc", isManager: true },
  });
  await prisma.userLocation.upsert({
    where: { userId_locationId: { userId: mia.id, locationId: "loc-bos" } },
    update: { isManager: true },
    create: { userId: mia.id, locationId: "loc-bos", isManager: true },
  });
  await prisma.userLocation.upsert({
    where: { userId_locationId: { userId: noah.id, locationId: "loc-sf" } },
    update: { isManager: true },
    create: { userId: noah.id, locationId: "loc-sf", isManager: true },
  });
  await prisma.userLocation.upsert({
    where: { userId_locationId: { userId: noah.id, locationId: "loc-sea" } },
    update: { isManager: true },
    create: { userId: noah.id, locationId: "loc-sea", isManager: true },
  });

  // Staff skills + certifications
  for (let i = 0; i < staffSeed.length; i++) {
    const s = staff[i];
    const seed = staffSeed[i];

    for (const skillName of seed.skills) {
      await prisma.userSkill.upsert({
        where: { userId_skillId: { userId: s.id, skillId: skillByName[skillName].id } },
        update: {},
        create: { userId: s.id, skillId: skillByName[skillName].id },
      });
    }

    for (const locId of seed.locs) {
      await prisma.userLocation.upsert({
        where: { userId_locationId: { userId: s.id, locationId: locId } },
        update: { isManager: false },
        create: { userId: s.id, locationId: locId, isManager: false },
      });
    }
  }

  // Availability (simple recurring 9-5 local time, plus a few exceptions to trigger edge cases)
  for (const s of staff) {
    // Default: Mon-Fri 09:00-17:00 in America/New_York (documented choice for seed)
    const tz = "America/New_York";
    for (const dow of [1, 2, 3, 4, 5]) {
      await prisma.availability.create({
        data: {
          userId: s.id,
          kind: "RECURRING",
          dayOfWeek: dow,
          startMinute: minutes("09:00"),
          endMinute: minutes("17:00"),
          timezone: tz,
        },
      });
    }
  }

  // A couple of exceptions:
  // Sarah is unavailable Sunday evening (for Sunday chaos scenario)
  const sarah = staff.find((u) => u.email === "sarah.staff@coastaleats.com");
  if (sarah) {
    await prisma.availability.create({
      data: {
        userId: sarah.id,
        kind: "EXCEPTION",
        exceptionType: "REMOVE_AVAILABLE",
        startTimeUtc: utcDate("2026-03-15T22:00:00Z"),
        endTimeUtc: utcDate("2026-03-16T03:00:00Z"),
        timezone: "America/New_York",
      },
    });
  }

  // Create a few shifts (including an overnight shift)
  const nyc = locations.find((l) => l.id === "loc-nyc")!;
  const sf = locations.find((l) => l.id === "loc-sf")!;

  const shifts = await Promise.all([
    prisma.shift.create({
      data: {
        locationId: nyc.id,
        requiredSkillId: skillByName["server"].id,
        startTimeUtc: utcDate("2026-03-15T23:00:00Z"),
        endTimeUtc: utcDate("2026-03-16T03:00:00Z"),
        headcount: 1,
        status: "PUBLISHED",
      },
    }),
    prisma.shift.create({
      data: {
        locationId: nyc.id,
        requiredSkillId: skillByName["bartender"].id,
        startTimeUtc: utcDate("2026-03-14T23:00:00Z"),
        endTimeUtc: utcDate("2026-03-15T04:00:00Z"),
        headcount: 1,
        status: "DRAFT",
      },
    }),
    prisma.shift.create({
      data: {
        locationId: sf.id,
        requiredSkillId: skillByName["bartender"].id,
        startTimeUtc: utcDate("2026-03-15T02:00:00Z"),
        endTimeUtc: utcDate("2026-03-15T07:00:00Z"),
        headcount: 1,
        status: "DRAFT",
      },
    }),
  ]);

  // Create a couple of assignments to start with (and make later constraint checks meaningful)
  const john = staff.find((u) => u.email === "john.staff@coastaleats.com");
  const omar = staff.find((u) => u.email === "omar.staff@coastaleats.com");
  if (john) {
    await prisma.shiftAssignment.create({
      data: {
        shiftId: shifts[1].id,
        userId: john.id,
      },
    });
  }
  if (omar) {
    await prisma.shiftAssignment.create({
      data: {
        shiftId: shifts[0].id,
        userId: omar.id,
      },
    });
  }

  // A small audit + notification example
  await prisma.auditLog.create({
    data: {
      actorUserId: admin.id,
      entityType: "seed",
      entityId: "initial",
      action: "SEED",
      after: { locations: locations.length, skills: skills.length, users: 3 + staff.length },
      reason: "Initial seed for ShiftSync",
    },
  });

  await prisma.notification.create({
    data: {
      userId: mia.id,
      type: "SEED_COMPLETE",
      payload: { message: "Seed data loaded. You can log in as mia.manager@coastaleats.com" },
    },
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

