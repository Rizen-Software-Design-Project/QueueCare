import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

import appointmentRoutes from '../routes/appointmentRoutes.js';
import queueRoutes from '../routes/queue_server.js';
import staffRoutes from '../routes/staff_server.js';
import notFound from '../middleware/notFound.js';
import errorHandler from '../middleware/errorHandler.js';

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(cors());
app.use(express.json());

// =====================
// HEALTH CHECK
// =====================
app.get('/health', (req, res) => {
  res.json({ status: 'API is running' });
});

// =====================
// API ROUTES (IMPORTANT: must come BEFORE frontend catch-all)
// =====================
app.use('/appointments', appointmentRoutes);
app.use('/queue', queueRoutes);
app.use('/staff', staffRoutes);

// =====================
// SERVE FRONTEND (React build)
// =====================
const __filename = fileURLToPath(import.meta.url);
const distPath = path.join(__dirname, '../../..', 'dist');

if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

// =====================
// React ROUTE HANDLER (ONLY for non-API routes)
// =====================
app.get(/^\/(?!(health|appointments|queue|staff|notify)(\/|$)).*/, (req, res) => {
  const indexPath = path.join(distPath, 'index.html');

  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).json({ error: 'Frontend build not found' });
  }
});

// =====================
// ERROR HANDLERS (must be last)
// =====================
app.use(notFound);
app.use(errorHandler);

export default app;