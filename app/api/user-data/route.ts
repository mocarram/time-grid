import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import type { Workspace } from "@/types/workspace";

// Force this route to be dynamic
export const dynamic = "force-dynamic";

interface UserData {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  lastSynced: string;
  userId: string;
}

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

    // Get user data from Redis
    const userDataStr = await redis.get(`user:${user.id}`);

    let userData;
    if (!userDataStr) {
      userData = {
        workspaces: [],
        activeWorkspaceId: null,
        lastSynced: null,
      };
    } else {
      userData = JSON.parse(userDataStr) as UserData;
    }

    return NextResponse.json({
      success: true,
      data: userData,
    });
  } catch (error) {
    console.error("Error fetching user data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { getUser, isAuthenticated } = getKindeServerSession();

    if (!isAuthenticated()) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await getUser();
    if (!user?.id) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const { workspaces, activeWorkspaceId } = body;

    // Validate the data structure
    if (!Array.isArray(workspaces)) {
      return NextResponse.json(
        { error: "Invalid workspaces data" },
        { status: 400 }
      );
    }

    const userData: UserData = {
      workspaces,
      activeWorkspaceId,
      lastSynced: new Date().toISOString(),
      userId: user.id,
    };

    // Save user data to Redis with expiration (1 year)
    await redis.setex(
      `user:${user.id}`,
      365 * 24 * 60 * 60, // 1 year in seconds
      JSON.stringify(userData)
    );

    return NextResponse.json({
      success: true,
      message: "Data synced successfully",
      lastSynced: userData.lastSynced,
    });
  } catch (error) {
    console.error("Error syncing user data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const { getUser, isAuthenticated } = getKindeServerSession();

    if (!isAuthenticated()) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await getUser();
    if (!user?.id) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Delete user data from Redis
    await redis.del(`user:${user.id}`);

    return NextResponse.json({
      success: true,
      message: "User data deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting user data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
