import { DosCarbonNotificationKind } from '../carbon/dos-carbon-notification.component';
export type DosStatusKind = 'info' | 'success' | 'warning' | 'danger';
/**
 * DosStatusBanner — inline notification.
 * Refined to use Carbon InlineNotification policies.
 */
export declare class DosStatusBannerComponent {
    kind: DosStatusKind;
    title: string;
    subtitle: string | null;
    mapKind(k: DosStatusKind): DosCarbonNotificationKind;
}
