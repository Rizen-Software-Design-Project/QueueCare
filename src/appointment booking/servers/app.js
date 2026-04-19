import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import 'dotenv/config';

import appointmentRoutes from '../routes/appointmentRoutes.js';
import queueRoutes       from '../routes/queue_server.js';
import staffRoutes       from '../routes/staff_server.js';
import notifyRoutes      from '../routes/notify_server.js';
import notFound          from '../middleware/notFound.js';
import errorHandler      from '../middleware/errorHandler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let distPath = path.join(__dirname, '../../../dist');
if (!fs.existsSync(distPath)) {
  distPath = path.join(__dirname, '../../dist');
}

const app = express();

app.use(cors());
app.use(express.json());

app.use('/',       appointmentRoutes);
app.use('/queue',  queueRoutes);
app.use('/staff',  staffRoutes);
app.use('/notify', notifyRoutes);

app.use(express.static(distPath));
app.get('{*path}', (req, res, next) => {
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) next();
  });
});

app.use(notFound);
app.use(errorHandler);

export default app;