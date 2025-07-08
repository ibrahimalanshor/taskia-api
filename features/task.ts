import { Router, Request, Response } from 'express';
import z from 'zod';
import { validate } from '../lib/validation';
import { db } from '../lib/db';

const taskRouter = Router();

const getTaskSchema = z.object({
  limit: z.number().positive().optional(),
});
const newTaskSchema = z.object({
  name: z.string().min(1),
  dueDate: z.string().date(),
});

taskRouter.get('/tasks', async (req: Request, res: Response) => {
  const queryValidation = await validate(getTaskSchema, req.query);

  if (!queryValidation.success) {
    res.status(400).json(queryValidation.errors);

    return;
  }

  const limit = queryValidation.data.limit ?? 10;

  const tasks = db
    .prepare('SELECT name, due_date, status FROM tasks LIMIT ?')
    .all(limit);

  res.json(tasks);

  return;
});

taskRouter.post('/tasks', async (req: Request, res: Response) => {
  const newTaskValidation = await validate(newTaskSchema, req.body);

  if (!newTaskValidation.success) {
    res.status(400).json(newTaskValidation.errors);

    return;
  }

  const task = db
    .prepare('INSERT INTO tasks (name, due_date, status) VALUES (?, ?, ?)')
    .run(newTaskValidation.data.name, newTaskValidation.data.dueDate, 'todo');

  res.json({
    id: task.lastInsertRowid,
  });

  return;
});

export { taskRouter };
