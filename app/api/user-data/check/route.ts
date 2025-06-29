import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";

// Force this route to be dynamic
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { getUser, isAuthenticated } = getKindeServerSession();

    if (!isAuthenticated()) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await getUser();
    if (!user?.id) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if user has data in Redis
    const exists = await redis.exists(`user:${user.id}`);

    let lastSynced = null;
    if (exists) {
      const userDataStr = await redis.get(`user:${user.id}`);
      if (userDataStr) {
        const userData = JSON.parse(userDataStr);
        lastSynced = userData.lastSynced;
      }
    }

    return NextResponse.json({
      hasData: exists === 1,
      lastSynced,
    });
  } catch (error) {
    console.error("Error checking user data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
