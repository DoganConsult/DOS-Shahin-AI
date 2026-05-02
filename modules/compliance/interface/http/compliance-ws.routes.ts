import { Router, Request, Response } from 'express';
import { authenticate, requireTenantId } from '../adapters/auth.adapter';

const router = Router();

router.use(authenticate);
router.use(requireTenantId);

/**
 * /api/compliance-ws — discovery endpoint for the compliance live-event WebSocket.
 *
 * The actual WebSocket upgrade is performed by the host service's WS bridge
 * (see services/<host>/ws-bridge.ts). This HTTP descriptor lets clients
 * discover the WS URL and the events they can subscribe to without
 * hard-coding it. Returns 200 with { url, protocols, events, heartbeat }.
 *
 * Wired in Sprint 1 / Track 2A so the manifest's `/api/compliance-ws`
 * routeBase is no longer baselined as "unwired".
 */
router.get('/', (req: Request, res: Response) => {
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const proto = (req.headers['x-forwarded-proto'] || 'https').toString();
  const wsProto = proto === 'https' ? 'wss' : 'ws';
  res.json({
    url: `${wsProto}://${host}/ws/compliance`,
    protocols: ['compliance.v1'],
    events: [
      'compliance.gap_detected',
      'compliance.gap_closed',
      'compliance.posture_changed',
      'compliance.assessment_completed',
      'compliance.framework_mapping_updated',
      'compliance.framework_gap_identified',
      'compliance.attestation_campaign_started',
      'compliance.attestation_recorded',
      'controls.created',
      'controls.status_changed',
      'controls.effectiveness_tested',
      'controls.effectiveness_failed',
      'controls.deficiency_detected',
    ],
    heartbeatSeconds: 30,
    auth: 'bearer-jwt-via-Sec-WebSocket-Protocol',
  });
});

export default router;
