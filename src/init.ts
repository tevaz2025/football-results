import { connectDB } from './db/connection';
import app from './app';
import { config } from './config';
import { seedAdmin } from './utils/seedAdmin';

const start = async () => {
  await connectDB();
  await seedAdmin();  
  app.listen(config.port, () => {
    console.log(` Servidor corriendo en http://localhost:${config.port}`);
  });
};

start();
