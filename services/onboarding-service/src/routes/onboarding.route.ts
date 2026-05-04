import { Router, type Request, type Response } from 'express';
import {
  addProduct, enrollModule, listProducts, listEnrollments,
  registerService, listServices,
} from '../lib/registry.js';
import { ProductSchema, EnrollSchema, ServiceSchema } from '../schemas/onboarding.schemas.js';

export const onboardingRouter = Router();

onboardingRouter.get('/products', async (_req, res) => {
  try { res.json({ products: await listProducts() }); }
  catch (e) { res.status(500).json({ error: 'list_failed', detail: String((e as Error).message) }); }
});

onboardingRouter.post('/products', async (req: Request, res: Response) => {
  const parse = ProductSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: 'validation', issues: parse.error.issues });
    return;
  }
  try {
    await addProduct(parse.data as any);
    res.status(201).json({ ok: true, product: parse.data });
  } catch (e) {
    res.status(500).json({ error: 'add_failed', detail: String((e as Error).message) });
  }
});

onboardingRouter.get('/enrollments', async (req, res) => {
  try {
    const pc = typeof req.query.product_code === 'string' ? req.query.product_code : undefined;
    res.json({ enrollments: await listEnrollments(pc) });
  } catch (e) {
    res.status(500).json({ error: 'list_failed', detail: String((e as Error).message) });
  }
});

onboardingRouter.post('/enrollments', async (req, res) => {
  const parse = EnrollSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: 'validation', issues: parse.error.issues });
    return;
  }
  try {
    await enrollModule(parse.data.product_code, parse.data.module_code, parse.data.edition, parse.data.enabled);
    res.status(201).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'enroll_failed', detail: String((e as Error).message) });
  }
});

onboardingRouter.get('/services', async (_req, res) => {
  try { res.json({ services: await listServices() }); }
  catch (e) { res.status(500).json({ error: 'list_failed', detail: String((e as Error).message) }); }
});

onboardingRouter.post('/services', async (req, res) => {
  const parse = ServiceSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: 'validation', issues: parse.error.issues });
    return;
  }
  try {
    await registerService(parse.data as any);
    res.status(201).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'register_failed', detail: String((e as Error).message) });
  }
});
