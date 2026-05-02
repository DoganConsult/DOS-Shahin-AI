import { Router } from 'express';
import notificationRouter from './notification.routes';
import inboxRouter from './inbox.routes';

export const notificationRoutes = Router();

notificationRoutes.use('/', notificationRouter);
notificationRoutes.use('/inbox', inboxRouter);
