import { prisma } from "@/lib/db";

export async function getOrCreatePrismaUser(input: {
  email: string;
  name?: string | null;
}) {
  return prisma.user.upsert({
    where: {
      email: input.email,
    },
    update: {
      name: input.name || undefined,
      lastLoginAt: new Date(),
    },
    create: {
      email: input.email,
      name: input.name || undefined,
      credits: 0,
      lastLoginAt: new Date(),
    },
    select: {
      id: true,
      email: true,
      name: true,
    },
  });
}
