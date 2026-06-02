import fs from "fs/promises";
import path from "path";
import { generateFloorPlanPresentationFromExactPlan } from "@/lib/floor-plan/presentation-renderer";

const DATA_DIR = path.join(process.cwd(), "data", "generated");
const JOBS_FILE = path.join(DATA_DIR, "floor-plan-presentation-jobs.json");

type JobStatus = "queued" | "running" | "completed" | "failed";

type PresentationJob = {
  id: string;
  status: JobStatus;
  projectId: string;
  projectTitle: string;
  userPrompt: string;
  exact?: any;
  result?: any;
  error?: string;
  createdAt: string;
  updatedAt: string;
};

function makeId() {
  return `fp-pres-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function readJobs(): Promise<Record<string, PresentationJob>> {
  try {
    const raw = await fs.readFile(JOBS_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

async function writeJobs(jobs: Record<string, PresentationJob>) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(JOBS_FILE, JSON.stringify(jobs, null, 2), "utf8");
}

async function updateJob(id: string, patch: Partial<PresentationJob>) {
  const jobs = await readJobs();
  const current = jobs[id];
  if (!current) return null;

  jobs[id] = {
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
  };

  await writeJobs(jobs);
  return jobs[id];
}

export async function getFloorPlanPresentationJob(id: string) {
  const jobs = await readJobs();
  return jobs[id] || null;
}

export async function startFloorPlanPresentationJob(args: {
  projectId: string;
  projectTitle: string;
  userPrompt: string;
  exact: any;
  architectAgent?: any;
}) {
  const id = makeId();
  const now = new Date().toISOString();

  const job: PresentationJob = {
    id,
    status: "queued",
    projectId: args.projectId,
    projectTitle: args.projectTitle,
    userPrompt: args.userPrompt,
    exact: args.exact,
    createdAt: now,
    updatedAt: now,
  };

  const jobs = await readJobs();
  jobs[id] = job;
  await writeJobs(jobs);

  setTimeout(() => {
    void (async () => {
      try {
        await updateJob(id, { status: "running" });

        const result = await generateFloorPlanPresentationFromExactPlan({
          projectId: args.projectId,
          projectTitle: args.projectTitle,
          userPrompt: args.userPrompt,
          exact: args.exact,
          architectAgent: args.architectAgent,
        });

        if (result?.ok) {
          await updateJob(id, {
            status: "completed",
            result,
          });
        } else {
          await updateJob(id, {
            status: "failed",
            result,
            error: result?.reason || "Presentation image failed",
          });
        }
      } catch (error: any) {
        await updateJob(id, {
          status: "failed",
          error: error?.message || String(error),
        });
      }
    })();
  }, 50);

  return job;
}
