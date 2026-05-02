import { Request, Response, NextFunction } from 'express';

export function requireOwnership(ownerField = 'owner_user_id') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as any).user;
    if (!user) { res.status(401).json({ error: 'Not authenticated' }); return; }
    if (user.is_super_admin === true) { next(); return; }

    (req as any).ownershipField = ownerField;
    (req as any).requestingUserId = user.userId || user.id;
    next();
  };
}
