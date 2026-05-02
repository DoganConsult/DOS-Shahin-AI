export const lifecycleGate = (moduleName: string) => (req: any, res: any, next: any) => next();
export const validate = (schema: any) => (req: any, res: any, next: any) => next();
export const asyncHandler = (fn: any) => (req: any, res: any, next: any) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
