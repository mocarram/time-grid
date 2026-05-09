import { logger } from "@infra/logger/index";
import { getRedis } from "@infra/redis/client";
import { createUserDataRepo } from "@infra/redis/user-data-repo";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { SyncPostBodySchema } from "@schemas/sync";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const log = logger.scoped("api.user-data");

const MAX_BODY_BYTES = 1_000_000;

async function authedUserId(): Promise<{ ok: true; userId: string } | { ok: false; status: 401 | 404 }> {
  const { getUser, isAuthenticated } = getKindeServerSession();
  if (!(await isAuthenticated())) return { ok: false, status: 401 };
  const user = await getUser();
  if (!user?.id) return { ok: false, status: 404 };
  return { ok: true, userId: user.id };
}

export async function GET() {
  const auth = await authedUserId();
  if (!auth.ok) return NextResponse.json({ error: "unauthorized" }, { status: auth.status });
  try {
    const repo = createUserDataRepo(getRedis());
    const data = await repo.get(auth.userId);
    return NextResponse.json({ success: true, data });
  } catch (e) {
    log.error("get failed", { error: String(e) });
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await authedUserId();
  if (!auth.ok) return NextResponse.json({ error: "unauthorized" }, { status: auth.status });
  try {
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
    }
    const json = await request.json();
    const parsed = SyncPostBodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid_body", issues: parsed.error.issues.map((i) => i.message) },
        { status: 400 },
      );
    }
    const repo = createUserDataRepo(getRedis());
    const result = await repo.save({
      userId: auth.userId,
      workspaces: parsed.data.workspaces,
      activeWorkspaceId: parsed.data.activeWorkspaceId,
      expectedRevision: parsed.data.expectedRevision,
    });
    if (result.kind === "unavailable") {
      return NextResponse.json({ error: "service_unavailable" }, { status: 503 });
    }
    if (result.kind === "conflict") {
      return NextResponse.json(
        { success: false, error: "revision_conflict", server: result.server },
        { status: 409 },
      );
    }
    return NextResponse.json({
      success: true,
      revision: result.data.revision,
      updatedAt: result.data.updatedAt,
    });
  } catch (e) {
    log.error("post failed", { error: String(e) });
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}

export async function DELETE() {
  const auth = await authedUserId();
  if (!auth.ok) return NextResponse.json({ error: "unauthorized" }, { status: auth.status });
  try {
    const repo = createUserDataRepo(getRedis());
    await repo.delete(auth.userId);
    return NextResponse.json({ success: true });
  } catch (e) {
    log.error("delete failed", { error: String(e) });
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
