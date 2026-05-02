import { Request, Response, NextFunction } from 'express';
type EventPublisher = (event: Record<string, unknown>) => Promise<void>;
export declare function setMutationEventPublisher(fn: EventPublisher): void;
export declare function mutationEventHook(moduleCode: string): (req: Request, res: Response, next: NextFunction) => void;
export {};
