import { Router, Request, Response } from 'express';
import z from 'zod';
import { validate } from '../lib/validation';
import { db } from '../lib/db';
import { checkAuth } from '../lib/auth';

const taskRouter = Router();

const getTaskSchema = z.object({
  not_status: z.enum(['todo', 'inprogress', 'done']).optional(),
});
const newTaskSchema = z.object({
  name: z.string().min(1),
});
const updateTaskSchema = z.object({
  name: z.string().min(1),
  status: z.enum(['todo', 'inprogress', 'done']),
});

taskRouter.get('/tasks', async (req: Request, res: Response) => {
  const authStatus = await checkAuth(req);

  if (!authStatus.success) {
    res.status(401).json({ message: authStatus.errors });

    return;
  }

  const getTaskQuery = await validate(getTaskSchema, req.query);

  if (!getTaskQuery.success) {
    res.status(400).json(getTaskQuery.errors);

    return;
  }

  const stmts: string[] = ['SELECT id, name, status FROM tasks'];
  const binds: string[] = [];

  if (getTaskQuery.data.not_status) {
    stmts.push('WHERE status != ?');
    binds.push(getTaskQuery.data.not_status);
  }

  stmts.push(
    `ORDER BY CASE WHEN status = 'inprogress' THEN 1 WHEN status = 'todo' THEN 2 ELSE 3 END`,
  );

  const tasks = db.prepare(stmts.join(' ')).all(...binds);

  res.json(tasks);

  return;
});

taskRouter.post('/tasks', async (req: Request, res: Response) => {
  const authStatus = await checkAuth(req);

  if (!authStatus.success) {
    res.status(401).json({ message: authStatus.errors });

    return;
  }

  const newTaskValidation = await validate(newTaskSchema, req.body);

  if (!newTaskValidation.success) {
    res.status(400).json(newTaskValidation.errors);

    return;
  }

  const task = db
    .prepare('INSERT INTO tasks (name, status) VALUES (?, ?)')
    .run(newTaskValidation.data.name, 'todo');

  res.json({
    id: task.lastInsertRowid,
  });

  return;
});

taskRouter.put('/tasks/:id', async (req: Request, res: Response) => {
  const authStatus = await checkAuth(req);

  if (!authStatus.success) {
    res.status(401).json({ message: authStatus.errors });

    return;
  }

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

  db.prepare('UPDATE tasks set name = ?, status = ? WHERE id = ?').run(
    updateTaskValidation.data.name,
    updateTaskValidation.data.status,
    req.params.id,
  );

  res.json({
    message: 'Ok',
  });

  return;
});

taskRouter.delete('/tasks/:id', async (req: Request, res: Response) => {
  const authStatus = await checkAuth(req);

  if (!authStatus.success) {
    res.status(401).json({ message: authStatus.errors });

    return;
  }

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
