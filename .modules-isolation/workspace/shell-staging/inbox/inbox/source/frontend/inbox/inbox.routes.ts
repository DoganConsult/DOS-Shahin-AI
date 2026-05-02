import { Routes } from '@angular/router';
import { InboxHubComponent } from './pages/inbox-hub.component';

export const INBOX_ROUTES: Routes = [
  { path: '', component: InboxHubComponent, data: { breadcrumb: 'Inbox', permission: 'inbox.read' } }
];
