import 'dotenv/config';
import express from 'express';
import { google } from 'googleapis';
import morgan from 'morgan';
import z from 'zod';
import cors from 'cors';

const port = process.env.PORT;

const server = express();

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

    const user = await googleAuth.userinfo.get();

    // {
    //   "size": 0,
    //   "data": {
    //       "id": "118165177496323926675",
    //       "email": "ibrahimalanshor6@gmail.com",
    //       "verified_email": true,
    //       "name": "Ibrahim Al Anshor",
    //       "given_name": "Ibrahim",
    //       "family_name": "Al Anshor",
    //       "picture": "https://lh3.googleusercontent.com/a/ACg8ocJEpoYsG0Cyp3kOSFzB6nPYsZ-0mANV3Il3v9DwTwlDz51wBiYV=s96-c"
    //   },
    //   "config": {
    //       "url": "https://www.googleapis.com/oauth2/v2/userinfo",
    //       "method": "GET",
    //       "apiVersion": "",
    //       "userAgentDirectives": [
    //           {
    //               "product": "google-api-nodejs-client",
    //               "version": "8.0.2-rc.0",
    //               "comment": "gzip"
    //           }
    //       ],
    //       "headers": {},
    //       "retry": true,
    //       "responseType": "unknown"
    //   },
    //   "headers": {}
    // }

    const accessToken = 'vaano';

    res.json({
      user,
      accessToken,
    });
  },
);

server.listen(port, () => {
  console.log(`server running on ${port}`);
});
