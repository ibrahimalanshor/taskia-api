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
const updateTaskSchema = z.object({
  name: z.string().min(1),
  dueDate: z.string().date(),
  status: z.enum(['todo', 'inprogress', 'done']),
});

taskRouter.get('/tasks', async (req: Request, res: Response) => {
  const queryValidation = await validate(getTaskSchema, req.query);

  if (!queryValidation.success) {
    res.status(400).json(queryValidation.errors);

    return;
  }

  const limit = queryValidation.data.limit ?? 10;

  const tasks = db
    .prepare('SELECT id, name, due_date dueDate, status FROM tasks LIMIT ?')
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

taskRouter.put('/tasks/:id', async (req: Request, res: Response) => {
  const updateTaskValidation = await validate(updateTaskSchema, req.body);

  if (!updateTaskValidation.success) {
    res.status(400).json(updateTaskValidation.errors);

    return;
  }

  const taskExists = db
    .prepare('SELECT id FROM tasks WHERE id = ?')
    .get(req.params.id);

  if (!taskExists) {
    res.json(404).json({ message: 'Task not found' });

    return;
  }

  db.prepare(
    'UPDATE tasks set name = ?, due_date = ?, status = ? WHERE id = ?',
  ).run(
    updateTaskValidation.data.name,
    updateTaskValidation.data.dueDate,
    updateTaskValidation.data.status,
    req.params.id,
  );

  res.json({
    message: 'Ok',
  });

  return;
});

taskRouter.delete('/tasks/:id', async (req: Request, res: Response) => {
  const deleted = db
    .prepare('DELETE FROM tasks WHERE id = ?')
    .run(req.params.id);

  if (deleted.changes < 1) {
    res.status(404).json({ message: 'Task not found' });

    return;
  }

  res.json({
    message: 'Ok',
  });

  return;
});

export { taskRouter };
