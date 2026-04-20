import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import appointmentRoutes from '../routes/appointmentRoutes.js';
import notFound from '../middleware/notFound.js';
import errorHandler from '../middleware/errorHandler.js';

const app = express();

const distPath = path.resolve('dist');

app.use(cors());
app.use(express.json());
app.use('/', appointmentRoutes);

// Serve the built React frontend
app.use(express.static(distPath));

// Catch-all for React Router — must be after API routes
app.get('*', (req, res, next) => {
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) next(err);  // pass error to errorHandler, not next route
  });
});

app.use(notFound);
app.use(errorHandler);

export default app;
