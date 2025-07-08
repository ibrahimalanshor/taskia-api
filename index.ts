import 'dotenv/config';
import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import { googleLoginRouter } from './features/google-login';
import { taskRouter } from './features/task';

const port = process.env.PORT;

const server = express();

server.use(cors());
server.use(express.json());
server.use(morgan('tiny'));

server.use(googleLoginRouter);
server.use(taskRouter);

server.listen(port, () => {
  console.log(`server running on ${port}`);
});
