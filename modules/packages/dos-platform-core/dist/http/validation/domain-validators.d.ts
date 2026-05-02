/**
 * Domain-specific validation middleware for AI engine routes.
 * Each validator returns Express middleware that validates req.body
 * against the appropriate Zod schema.
 */
import { Request, Response, NextFunction } from 'express';
export declare const validateRiskAppetite: (req: Request, res: Response, next: NextFunction) => void;
export declare const validateAuthorityMatrix: (req: Request, res: Response, next: NextFunction) => void;
export declare const validateEscalationThresholds: (req: Request, res: Response, next: NextFunction) => void;
export declare const validateTelemetryIngest: (req: Request, res: Response, next: NextFunction) => void;
export declare const validateTelemetryBatch: (req: Request, res: Response, next: NextFunction) => void;
export declare const validateReleaseGate: (req: Request, res: Response, next: NextFunction) => void;
export declare const validateVendorGate: (req: Request, res: Response, next: NextFunction) => void;
export declare const validateGateOverride: (req: Request, res: Response, next: NextFunction) => void;
export declare const validateSOP: (req: Request, res: Response, next: NextFunction) => void;
export declare const validateRunbook: (req: Request, res: Response, next: NextFunction) => void;
export declare const validateWebhookPayload: (req: Request, res: Response, next: NextFunction) => void;
/**
 * Middleware that requires a tenant_id on the request (from JWT or header).
 */
export declare function requireTenant(req: Request, res: Response, next: NextFunction): void;
