import 'dotenv/config';
import express from 'express';

const port = process.env.PORT;

const server = express();

server.listen(port, () => {
  console.log(`server running on ${port}`);
});
