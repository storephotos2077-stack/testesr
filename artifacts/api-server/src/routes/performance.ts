import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, performanceReviewsTable, goalsTable, employeesTable } from "@workspace/db";
import { requireAuth, isHR } from "../middlewares/auth";

const router: IRouter = Router();

// ── Performance Reviews ────────────────────────────────────────────────────
router.get("/performance/reviews", requireAuth, async (req, res): Promise<void> => {
  const conditions = req.query.employeeId
    ? [eq(performanceReviewsTable.employeeId, parseInt(req.query.employeeId as string, 10))]
    : [];

  const reviews = await db
    .select()
    .from(performanceReviewsTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(performanceReviewsTable.createdAt);

  const allEmps = await db.select().from(employeesTable);
  const empMap = new Map(allEmps.map((e) => [e.id, e.fullName]));

  res.json(
    reviews.map((r) => ({
      id: r.id,
      employeeId: r.employeeId,
      employeeName: empMap.get(r.employeeId) ?? null,
      reviewerId: r.reviewerId,
      reviewerName: empMap.get(r.reviewerId) ?? null,
      rating: r.rating,
      period: r.period,
      strengths: r.strengths,
      improvements: r.improvements,
      employeeComment: r.employeeComment,
      acknowledged: r.acknowledged,
      createdAt: r.createdAt.toISOString(),
    })),
  );
});

router.post("/performance/reviews", requireAuth, async (req, res): Promise<void> => {
  const { employeeId, rating, period, strengths, improvements } = req.body;
  if (!employeeId || !rating || !period) {
    res.status(400).json({ error: "employeeId, rating, and period are required" });
    return;
  }

  // Use reviewer's employee ID from profile
  const allEmps = await db.select().from(employeesTable);
  const empMap = new Map(allEmps.map((e) => [e.id, e.fullName]));

  // Find reviewer employee linked to this profile
  const reviewerId = req.employeeId ?? employeeId;

  const [review] = await db
    .insert(performanceReviewsTable)
    .values({ employeeId, reviewerId, rating, period, strengths, improvements })
    .returning();

  res.status(201).json({
    id: review.id,
    employeeId: review.employeeId,
    employeeName: empMap.get(review.employeeId) ?? null,
    reviewerId: review.reviewerId,
    reviewerName: empMap.get(review.reviewerId) ?? null,
    rating: review.rating,
    period: review.period,
    strengths: review.strengths,
    improvements: review.improvements,
    employeeComment: review.employeeComment,
    acknowledged: review.acknowledged,
    createdAt: review.createdAt.toISOString(),
  });
});

router.patch("/performance/reviews/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const { rating, strengths, improvements, employeeComment, acknowledged } = req.body;

  const [review] = await db
    .update(performanceReviewsTable)
    .set({ rating, strengths, improvements, employeeComment, acknowledged })
    .where(eq(performanceReviewsTable.id, id))
    .returning();

  if (!review) {
    res.status(404).json({ error: "Review not found" });
    return;
  }

  const allEmps = await db.select().from(employeesTable);
  const empMap = new Map(allEmps.map((e) => [e.id, e.fullName]));

  res.json({
    id: review.id,
    employeeId: review.employeeId,
    employeeName: empMap.get(review.employeeId) ?? null,
    reviewerId: review.reviewerId,
    reviewerName: empMap.get(review.reviewerId) ?? null,
    rating: review.rating,
    period: review.period,
    strengths: review.strengths,
    improvements: review.improvements,
    employeeComment: review.employeeComment,
    acknowledged: review.acknowledged,
    createdAt: review.createdAt.toISOString(),
  });
});

// ── Goals ──────────────────────────────────────────────────────────────────
router.get("/performance/goals", requireAuth, async (req, res): Promise<void> => {
  const conditions = req.query.employeeId
    ? [eq(goalsTable.employeeId, parseInt(req.query.employeeId as string, 10))]
    : [];

  const goals = await db
    .select()
    .from(goalsTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(goalsTable.createdAt);

  const allEmps = await db.select().from(employeesTable);
  const empMap = new Map(allEmps.map((e) => [e.id, e.fullName]));

  res.json(
    goals.map((g) => ({
      id: g.id,
      employeeId: g.employeeId,
      employeeName: empMap.get(g.employeeId) ?? null,
      title: g.title,
      description: g.description,
      targetDate: g.targetDate,
      progress: g.progress,
      createdAt: g.createdAt.toISOString(),
    })),
  );
});

router.post("/performance/goals", requireAuth, async (req, res): Promise<void> => {
  const { employeeId, title, description, targetDate, progress } = req.body;
  if (!employeeId || !title || !targetDate) {
    res.status(400).json({ error: "employeeId, title, and targetDate are required" });
    return;
  }

  const [goal] = await db
    .insert(goalsTable)
    .values({ employeeId, title, description, targetDate, progress: progress ?? 0 })
    .returning();

  const [emp] = await db.select().from(employeesTable).where(eq(employeesTable.id, employeeId));

  res.status(201).json({
    id: goal.id,
    employeeId: goal.employeeId,
    employeeName: emp?.fullName ?? null,
    title: goal.title,
    description: goal.description,
    targetDate: goal.targetDate,
    progress: goal.progress,
    createdAt: goal.createdAt.toISOString(),
  });
});

router.patch("/performance/goals/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const [goal] = await db
    .update(goalsTable)
    .set(req.body)
    .where(eq(goalsTable.id, id))
    .returning();

  if (!goal) {
    res.status(404).json({ error: "Goal not found" });
    return;
  }

  const [emp] = await db.select().from(employeesTable).where(eq(employeesTable.id, goal.employeeId));

  res.json({
    id: goal.id,
    employeeId: goal.employeeId,
    employeeName: emp?.fullName ?? null,
    title: goal.title,
    description: goal.description,
    targetDate: goal.targetDate,
    progress: goal.progress,
    createdAt: goal.createdAt.toISOString(),
  });
});

router.delete("/performance/goals/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  await db.delete(goalsTable).where(eq(goalsTable.id, id));
  res.sendStatus(204);
});

export default router;
