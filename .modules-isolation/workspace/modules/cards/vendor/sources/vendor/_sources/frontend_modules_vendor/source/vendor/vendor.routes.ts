import { Routes } from '@angular/router';
import { VendorListComponent } from './pages/vendor-list/vendor-list.component';

export const VENDOR_ROUTES: Routes = [
  {
    path: '',
    component: VendorListComponent,
    data: { 
      breadcrumb: 'Vendors', 
      permission: 'vendor.record.read',
      menuIcon: 'pi pi-briefcase' 
    }
  }
];
