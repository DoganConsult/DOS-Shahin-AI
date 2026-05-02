import { Router } from 'express';

export const routes = Router();

routes.get('/info', (_req, res) => {
  res.json({
    service: 'sales-room-service',
    version: '0.1.0',
    surfaces: ['admin', 'public', 'signed'],
    storageDriver: process.env.SALES_ROOM_STORAGE_DRIVER || 'fs',
  });
});
