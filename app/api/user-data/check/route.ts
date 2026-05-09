import { logger } from "@infra/logger/index";
import { getRedis } from "@infra/redis/client";
import { createUserDataRepo } from "@infra/redis/user-data-repo";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const log = logger.scoped("api.user-data.check");

export async function GET() {
  const { getUser, isAuthenticated } = getKindeServerSession();
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const user = await getUser();
  if (!user?.id) return NextResponse.json({ error: "user_not_found" }, { status: 404 });

  try {
    const repo = createUserDataRepo(getRedis());
    const data = await repo.get(user.id);
    return NextResponse.json({
      hasData: data !== null,
      lastSynced: data?.updatedAt ?? null,
      revision: data?.revision ?? null,
    });
  } catch (e) {
    log.error("check failed", { error: String(e) });
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
