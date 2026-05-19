import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import rateLimit from 'express-rate-limit';

import appointmentRoutes from '../routes/appointmentRoutes.js';
import queueRoutes from '../routes/queue_server.js';
import staffRoutes from '../routes/staff_server.js';
import notifyRoutes from '../routes/notify_server.js';
import scheduleRoutes from '../routes/schedule_server.js';

import aiRoutes from '../routes/ai_server.js';
import notFound from '../middleware/notFound.js';
import errorHandler from '../middleware/errorHandler.js';

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Here we define three rate limiters to protect the API from being abused or flooded with requests. I just thought it  would be cool to include it.
const isTest = process.env.NODE_ENV === 'test';

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTest,
  message: { error: 'Too many requests, please try again later.' },
});

// Booking actions touch real patient data so we give them a tighter cap to stop anyone from spamming the endpoint
const bookingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTest,
  message: { error: 'Too many booking requests, please slow down.' },
});

// The AI endpoint costs money on every call so we keep it on a much tighter leash than the rest of the app
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  /* v8 ignore next */
  skip: () => isTest,
  message: { error: 'AI request limit reached, please wait before sending more messages.' },
});

app.use(cors());
app.use(express.json());
app.use(globalLimiter);

// A simple health check so deployment tools and uptime monitors can confirm the server is alive
app.get('/health', (req, res) => {
  res.json({ status: 'API is running' });
});

// All the API routes go here and they must come before the frontend catch-all otherwise React Router intercepts them first
app.use('/appointments/book',              bookingLimiter);
app.use('/appointments/book-walkin',       bookingLimiter);
app.use('/appointments/queue/walk-in',     bookingLimiter);
app.use('/appointments', appointmentRoutes);
app.use('/queue/add_to_queue',             bookingLimiter);
app.use('/queue', queueRoutes);
app.use('/staff', staffRoutes);
app.use('/notify', notifyRoutes);
app.use('/ai', aiLimiter, aiRoutes);
app.use('/', scheduleRoutes);

// If a React build folder exists we serve everything inside it as static files so the frontend loads properly
const __filename = fileURLToPath(import.meta.url);
const distPath = path.join(__dirname, '../../..', 'dist');

/* v8 ignore start */
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

// This catch-all sends index.html to any non-API path so React Router can handle client-side navigation
app.get(/^\/(?!(health|appointments|queue|staff|notify|schedule|get_staff|ai)(\/|$)).*/, (req, res) => {
  const indexPath = path.join(distPath, 'index.html');

  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).json({ error: 'Frontend build not found' });
  }
});
/* v8 ignore stop */

// Error handlers always go last — if they're registered before the routes they won't catch anything thrown above them
app.use(notFound);
app.use(errorHandler);

export default app;