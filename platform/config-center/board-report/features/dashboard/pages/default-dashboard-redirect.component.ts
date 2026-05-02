import { Component, OnInit, inject, ChangeDetectionStrategy} from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { DashboardApiService } from '../../../../../core/dashboard/dashboard-api.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-default-dashboard-redirect',
  standalone: true,
  template: `Loading dashboard...`,
})
export class DefaultDashboardRedirectComponent implements OnInit {
  private router = inject(Router);
  private api = inject(DashboardApiService);

  async ngOnInit(): Promise<void> {
    const resolved = await firstValueFrom(this.api.resolveDefault());
    await this.router.navigateByUrl(`/dashboard/${resolved.dashboardCode}`);
  }
}
