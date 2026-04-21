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

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'API is running' });
});

// API routes
app.use('/appointments', appointmentRoutes);
app.use('/queue', queueRoutes);
app.use('/staff', staffRoutes);

// Serve static React build
app.use(express.static(path.join(__dirname, '../../..', 'dist')));

// Catch-all for React routing (BEFORE error handlers)
app.all(/.*/, (req, res) => {
  const indexPath = path.join(__dirname, '../../..', 'dist', 'index.html');
  
  if (!fs.existsSync(indexPath)) {
    return res.status(404).json({ error: 'Frontend not found' });
  }
  
  res.sendFile(indexPath);
});
  


app.use(notFound);
app.use(errorHandler);

export default app;