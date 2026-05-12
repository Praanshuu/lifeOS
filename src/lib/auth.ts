import { auth, currentUser } from "@clerk/nextjs/server";
import type { User as ClerkUser } from "@clerk/backend";
import { db } from "@/db";
import { activities, users } from "@/db/schema";

export async function requireUserId() {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }
  return userId;
}

function profileFromClerkUser(clerkUser: ClerkUser): {
  email: string | null;
  displayName: string | null;
} {
  const primaryId = clerkUser.primaryEmailAddressId;
  const email =
    primaryId != null
      ? clerkUser.emailAddresses.find((e) => e.id === primaryId)?.emailAddress ?? null
      : clerkUser.emailAddresses[0]?.emailAddress ?? null;

  const nameParts = [clerkUser.firstName, clerkUser.lastName].filter(
    (p): p is string => Boolean(p)
  );
  let displayName: string | null = nameParts.length > 0 ? nameParts.join(" ") : null;
  if (!displayName && clerkUser.username) displayName = clerkUser.username;
  if (!displayName && email) displayName = email;

  return { email, displayName };
}

export async function ensureUserSetup(userId: string) {
  const clerkUser = await currentUser();

  let email: string | null = null;
  let displayName: string | null = null;

  if (clerkUser && clerkUser.id === userId) {
    const profile = profileFromClerkUser(clerkUser);
    email = profile.email;
    displayName = profile.displayName;
  }

  const updateFields: { email?: string | null; displayName?: string | null } = {};
  if (email !== null) updateFields.email = email;
  if (displayName !== null) updateFields.displayName = displayName;

  if (Object.keys(updateFields).length > 0) {
    await db
      .insert(users)
      .values({ clerkId: userId, email, displayName })
      .onConflictDoUpdate({
        target: users.clerkId,
        set: updateFields,
      });
  } else {
    await db.insert(users).values({ clerkId: userId }).onConflictDoNothing();
  }

  await db.insert(activities).values([
    { userId, name: "Break", type: "break", isSystem: true },
    { userId, name: "Distraction", type: "distraction", isSystem: true },
    { userId, name: "Lunch", type: "break", isSystem: true },
  ]).onConflictDoNothing();
}
