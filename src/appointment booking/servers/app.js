import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import fs from 'fs';

import appointmentRoutes from '../routes/appointmentRoutes.js';
import notFound from '../middleware/notFound.js';
import errorHandler from '../middleware/errorHandler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Support both local dev (../../../dist) and Azure deployment (../../dist)
let distPath = path.join(__dirname, '../../../dist');
if (!fs.existsSync(distPath)) {
  distPath = path.join(__dirname, '../../dist');
}

const app = express();

app.use(cors());
app.use(express.json());
app.use('/', appointmentRoutes);

// Serve the built React frontend
app.use(express.static(distPath));
app.get('*', (req, res, next) => {
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) {
      next();
    }
  });
});

app.use(notFound);
app.use(errorHandler);

export default app;
