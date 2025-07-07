import 'dotenv/config';
import express from 'express';
import { google } from 'googleapis';
import morgan from 'morgan';
import z from 'zod';
import cors from 'cors';
import Database from 'better-sqlite3';

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

interface AuthResult {
  user: {
    id: number | bigint;
    name: string;
    email: string;
  };
  accessToken: string;
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

  return {
    user: {
      id: createdUser.lastInsertRowid,
      name: googleAccount.name,
      email: googleAccount.email,
    },
    accessToken: 'blah',
  };
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
      throw new Error('error getting google acount data');
    }

    const getUserStmt = db.prepare('SELECT * FROM users WHERE email = ?');
    const user = getUserStmt.get(googleAccount.data.email);

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
  },
);

server.listen(port, () => {
  console.log(`server running on ${port}`);
});
