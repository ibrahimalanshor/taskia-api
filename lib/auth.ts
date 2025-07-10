import { Request } from 'express';
import { User } from '../features/user';
import { Response } from '../helpers/response';
import jwt from 'jsonwebtoken';
import { db } from './db';

interface AuthUser {
  user: User;
}

export async function checkAuth(
  req: Request,
): Promise<Response<AuthUser, string>> {
  const token = req.headers.authorization;

  if (!token) {
    return {
      success: false,
      errors: 'Token is required',
    };
  }

  try {
    const payload = (await jwt.verify(
      token,
      process.env.AUTH_SECRET_KEY || 'secret',
    )) as { user_id: string };
    const userId = payload.user_id;

    const user = db
      .prepare('SELECT id, name, email FROM users WHERE id = ?')
      .get(userId) as User;

    if (!user) {
      return {
        success: false,
        errors: 'User id is not found',
      };
    }

    return {
      success: true,
      data: {
        user,
      },
    };
  } catch {
    return {
      success: false,
      errors: 'Token is invalid',
    };
  }
}
