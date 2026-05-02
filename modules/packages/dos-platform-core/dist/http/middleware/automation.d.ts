import { Request, Response, NextFunction } from 'express';
type EventPublisher = (event: Record<string, unknown>) => Promise<void>;
export declare function setAutomationEventPublisher(fn: EventPublisher): void;
export declare function automationMiddleware(triggerCode?: string): (req: Request, res: Response, next: NextFunction) => void;
export {};
