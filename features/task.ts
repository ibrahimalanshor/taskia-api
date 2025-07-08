import { Router, Request, Response } from 'express';
import z from 'zod';
import { validate } from '../lib/validation';
import { db } from '../lib/db';

const taskRouter = Router();

const taskQuerySchema = z.object({
  limit: z.number().positive().optional(),
});

taskRouter.get('/tasks', async (req: Request, res: Response) => {
  const queryValidation = await validate(taskQuerySchema, req.query);

  if (!queryValidation.success) {
    res.status(400).json(queryValidation.errors);

    return;
  }

  const limit = queryValidation.data.limit ?? 10;

  const tasks = db
    .prepare('SELECT name, due_date, status FROM tasks LIMIT = ?')
    .all(limit);

  res.json(tasks);

  return;
});

export { taskRouter };
