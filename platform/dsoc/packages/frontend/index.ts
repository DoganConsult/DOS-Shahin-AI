/**
 * @dos/dsoc-frontend — Angular-side surface for DSOC consumers.
 * Re-exports the injection tokens + types; consumers of subpath
 * `@dos/dsoc-frontend/ports` get the same surface.
 */

export {
  DSOC_EVENT_FEED_PORT,
  DSOC_ALERT_INBOX_PORT,
  DSOC_POSTURE_PORT,
} from './ports';

export type {
  DSOCEventFeedPort,
  DSOCAlertInboxPort,
  DSOCPosturePort,
} from './ports';

// Real HTTP client implementations of the ports.
export {
  DSOCEventFeedHttpClient,
  DSOCAlertInboxHttpClient,
  DSOCPostureHttpClient,
} from './services/dsoc-http.client';

// UI components.
export { DsocAlertInboxComponent } from './components/alert-inbox/dsoc-alert-inbox.component';
