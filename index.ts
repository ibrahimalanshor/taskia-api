import 'dotenv/config';
import express from 'express';
import { google } from 'googleapis';
import morgan from 'morgan';
import z from 'zod';
import cors from 'cors';
import Database from 'better-sqlite3';
import jwt from 'jsonwebtoken';

const port = process.env.PORT;

const server = express();
const db = new Database('taskia.db');

server.use(cors());
server.use(express.json());
server.use(morgan('tiny'));

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

interface User {
  id: number | bigint;
  name: string;
  email: string;
  google_id: string;
}
interface AuthResult {
  user: User;
  accessToken: string;
}

async function generateAuthResult(user: User): Promise<AuthResult> {
  return {
    user,
    accessToken: await jwt.sign(
      { user_id: user.id },
      process.env.SECRET_KEY || 'secret',
      { expiresIn: '15m' },
    ),
  };
}
async function register(googleAccount: {
  id: string;
  name: string;
  email: string;
}): Promise<AuthResult> {
  const createUserStmt = db.prepare(
    'INSERT INTO users (google_id, name, email) VALUES (?, ?, ?)',
  );
  const createdUser = createUserStmt.run(
    googleAccount.id,
    googleAccount.name,
    googleAccount.email,
  );

  return await generateAuthResult({
    id: createdUser.lastInsertRowid,
    name: googleAccount.name,
    email: googleAccount.email,
    google_id: googleAccount.id,
  });
}

server.post(
  '/login/google',
  async (req: express.Request, res: express.Response) => {
    const validation = await googleLoginSchema.safeParseAsync(req.body);

    if (!validation.success) {
      res
        .status(422)
        .json(
          Object.fromEntries(
            validation.error.issues.map((issue) => [
              issue.path[0],
              issue.message,
            ]),
          ),
        );

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

    const getUserStmt = db.prepare('SELECT * FROM users WHERE email = ?');
    const user = getUserStmt.get(googleAccount.data.email) as User | undefined;

    if (!user) {
      res.json(
        await register({
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

    res.json(await generateAuthResult(user));

    return;
  },
);

server.get('/tasks', (req: express.Request, res: express.Response) => {
  res.json([]);
});

server.listen(port, () => {
  console.log(`server running on ${port}`);
});
