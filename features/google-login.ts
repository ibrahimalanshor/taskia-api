import 'dotenv/config';
import express, { Router } from 'express';
import { google } from 'googleapis';
import z from 'zod';
import jwt from 'jsonwebtoken';
import { db } from '../lib/db';
import { validate } from '../lib/validation';
import { User } from './user';
import type { StringValue } from 'ms';

interface AuthResult {
  user: User;
  accessToken: string;
}

const googleAuthClient = new google.auth.OAuth2({
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  redirectUri: process.env.GOOGLE_REDIRECT_URI,
});
const googleAuth = google.oauth2({
  auth: googleAuthClient,
  version: 'v2',
});
const googleLoginSchema = z.object({
  code: z.string().min(10),
});
const googleLoginRouter = Router();

function generateAuthResult(user: User): AuthResult {
  const expiresIn = (process.env.AUTH_EXPIRES_IN || '15m') as StringValue;

  return {
    user,
    accessToken: jwt.sign(
      { user_id: user.id },
      process.env.AUTH_SECRET_KEY || 'secret',
      {
        expiresIn,
      },
    ),
  };
}
function register(googleAccount: {
  id: string;
  name: string;
  email: string;
}): AuthResult {
  const user = db
    .prepare('INSERT INTO users (google_id, name, email) VALUES (?, ?, ?)')
    .run(googleAccount.id, googleAccount.name, googleAccount.email);

  return generateAuthResult({
    id: user.lastInsertRowid,
    name: googleAccount.name,
    email: googleAccount.email,
    google_id: googleAccount.id,
  });
}

googleLoginRouter.post(
  '/login/google',
  async (req: express.Request, res: express.Response) => {
    const validation = await validate(googleLoginSchema, req.body);

    if (!validation.success) {
      res.status(422).json(validation.errors);

      return;
    }

    const { tokens } = await googleAuthClient.getToken(validation.data.code);

    googleAuthClient.setCredentials(tokens);

    const googleAccount = await googleAuth.userinfo.get();

    if (
      !googleAccount.data.id ||
      !googleAccount.data.name ||
      !googleAccount.data.email
    ) {
      res.status(400).json({
        message: 'Error getting google acount data',
      });

      return;
    }

    const user = db
      .prepare('SELECT id, name, email, google_id FROM users WHERE email = ?')
      .get(googleAccount.data.email) as User | undefined;

    if (!user) {
      res.json(
        register({
          id: googleAccount.data.id,
          name: googleAccount.data.name,
          email: googleAccount.data.email,
        }),
      );

      return;
    }

    if (user.google_id !== googleAccount.data.id) {
      res.status(400).json({
        message: 'The email is already used',
      });

      return;
    }

    res.json(generateAuthResult(user));

    return;
  },
);

export { googleLoginRouter };
