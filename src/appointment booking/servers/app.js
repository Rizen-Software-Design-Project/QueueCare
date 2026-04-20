import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import appointmentRoutes from '../routes/appointmentRoutes.js';
import queueRoutes from '../routes/queue_server.js';
import staffRoutes from '../routes/staff_server.js';
import notFound from '../middleware/notFound.js';
import errorHandler from '../middleware/errorHandler.js';


const app = express();

const distPath = path.resolve('dist');

app.use(cors());
app.use(express.json());
app.use('/', appointmentRoutes);
app.use('/queue', queueRoutes);
app.use('/staff', staffRoutes);


app.use(notFound);
app.use(errorHandler);

export default app;
