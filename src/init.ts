import { connectDB } from './db/connection';
import app from './app';
import { config } from './config';

const start = async () => {
  await connectDB();
  app.listen(config.port, () => {
    console.log(`Servidor corriendo en http://localhost:${config.port}`);
  });
};

start();
