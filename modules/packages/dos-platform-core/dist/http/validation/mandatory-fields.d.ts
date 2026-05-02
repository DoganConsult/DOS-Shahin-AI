import { Request, Response, NextFunction } from 'express';
type FieldRule = {
    field: string;
    label: string;
};
type StageGateRule = {
    targetStatus: string;
    requiredFields: FieldRule[];
    message: string;
};
type RuleMap<T> = Record<string, T[]>;
export declare const MODULE_RULES: RuleMap<FieldRule>;
export declare const STAGE_GATE_RULES: RuleMap<StageGateRule>;
export declare function mandatoryFields(moduleCode: string): (req: Request, res: Response, next: NextFunction) => void;
export {};
