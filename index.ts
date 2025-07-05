import 'dotenv/config';
import express from 'express';
import morgan from 'morgan';

const port = process.env.PORT;

const server = express();

server.use(morgan('tiny'));

server.post('/login', (req: express.Request, res: express.Response) => {
  const accessToken = 'vaano';
  res.json({
    accessToken,
  });
});

server.listen(port, () => {
  console.log(`server running on ${port}`);
});
