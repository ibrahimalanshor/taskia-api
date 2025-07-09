import { Router, Request, Response } from 'express';
import { checkAuth } from '../lib/auth';

const authRouter = Router();

authRouter.get('/me', async (req: Request, res: Response) => {
  const authStatus = await checkAuth(req);

  if (!authStatus.success) {
    res.status(401).json({ message: authStatus.errors });

    return;
  }

  res.json({
    user: authStatus.data.user,
  });
});

export { authRouter };
