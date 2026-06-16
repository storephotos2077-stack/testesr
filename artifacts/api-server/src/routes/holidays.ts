import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, holidaysTable } from "@workspace/db";
import { requireAuth, isHR } from "../middlewares/auth";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/holidays", requireAuth, async (req, res): Promise<void> => {
  const conditions = req.query.year
    ? [sql`extract(year from ${holidaysTable.date}::date) = ${parseInt(req.query.year as string, 10)}`]
    : [];

  const holidays = await db
    .select()
    .from(holidaysTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(holidaysTable.date);

  res.json(holidays.map((h) => ({ ...h, createdAt: h.createdAt.toISOString() })));
});

router.post("/holidays", isHR, async (req, res): Promise<void> => {
  const { name, date, description, isOptional } = req.body;
  if (!name || !date) {
    res.status(400).json({ error: "Name and date are required" });
    return;
  }

  const [holiday] = await db
    .insert(holidaysTable)
    .values({ name, date, description, isOptional: isOptional ?? false })
    .returning();

  res.status(201).json({ ...holiday, createdAt: holiday.createdAt.toISOString() });
});

router.patch("/holidays/:id", isHR, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const [holiday] = await db
    .update(holidaysTable)
    .set(req.body)
    .where(eq(holidaysTable.id, id))
    .returning();

  if (!holiday) {
    res.status(404).json({ error: "Holiday not found" });
    return;
  }

  res.json({ ...holiday, createdAt: holiday.createdAt.toISOString() });
});

router.delete("/holidays/:id", isHR, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  await db.delete(holidaysTable).where(eq(holidaysTable.id, id));
  res.sendStatus(204);
});

export default router;
