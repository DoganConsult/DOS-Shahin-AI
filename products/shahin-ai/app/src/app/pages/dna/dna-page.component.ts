import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { LinkModule } from 'carbon-components-angular';
import { WorkspaceStubComponent } from '../workspace/workspace-stub.component';
import { WorkspaceShellConfigService } from '../../shell/workspace-shell-config.service';
import {
  SHAHIN_DNA_PAGE_DEFS,
  findDnaModulePack,
} from '../../shell/dna-nav-contracts';

interface DnaRouteData {
  moduleCode?: string;
  moduleLabelEn?: string;
  moduleLabelAr?: string;
  pageId?: string;
  pageLabelEn?: string;
  pageLabelAr?: string;
  descriptionEn?: string;
  descriptionAr?: string;
}

@Component({
  selector: 'app-dna-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, LinkModule, WorkspaceStubComponent],
  template: `
    <section class="dna-page" [attr.dir]="cfg.direction()">
      <app-workspace-stub
        [eyebrow]="eyebrow()"
        [title]="title()"
        [description]="description()"
      ></app-workspace-stub>

      <nav class="dna-page__links" aria-label="Module pages">
        @for (page of pages; track page.id) {
          <a
            cdsLink
            [routerLink]="['/', moduleCode(), page.id]"
            class="dna-page__link"
            [class.dna-page__link--active]="page.id === pageId()"
          >
            {{ pageLabel(page.id) }}
          </a>
        }
      </nav>
    </section>
  `,
  styles: [`
    .dna-page {
      display: flex;
      flex-direction: column;
      gap: var(--cds-spacing-05, 1rem);
    }

    .dna-page__links {
      max-width: 1100px;
      width: 100%;
      margin-inline: auto;
      padding-inline: var(--cds-spacing-06, 1.5rem);
      display: flex;
      flex-wrap: wrap;
      gap: var(--cds-spacing-04, 0.75rem);
    }

    .dna-page__link {
      display: inline-flex;
      align-items: center;
      min-height: 2rem;
      padding: 0.125rem 0;
      color: var(--cds-link-primary, #0f62fe);
      text-decoration: none;
    }

    .dna-page__link--active {
      font-weight: 600;
      text-decoration: underline;
      text-underline-offset: 0.2rem;
    }
  `],
})
export class DnaPageComponent {
  readonly cfg = inject(WorkspaceShellConfigService);
  private readonly route = inject(ActivatedRoute);
  private readonly routeData = toSignal(this.route.data, { initialValue: this.route.snapshot.data });

  readonly moduleCode = computed(() => String((this.routeData() as DnaRouteData).moduleCode ?? 'foundation'));
  readonly modulePack = computed(() => findDnaModulePack(this.moduleCode()));
  readonly pageId = computed(() => String((this.routeData() as DnaRouteData).pageId ?? 'home'));
  readonly pages = SHAHIN_DNA_PAGE_DEFS;

  readonly eyebrow = computed(() => {
    return this.cfg.locale() === 'ar'
      ? 'وحدات الحمض النووي للمنصة'
      : 'Platform DNA modules';
  });

  readonly title = computed(() => {
    const data = this.routeData() as DnaRouteData;
    const moduleLabel = this.cfg.locale() === 'ar'
      ? data.moduleLabelAr ?? this.modulePack()?.labelAr ?? this.moduleCode()
      : data.moduleLabelEn ?? this.modulePack()?.labelEn ?? this.moduleCode();
    const pageLabel = this.cfg.locale() === 'ar'
      ? data.pageLabelAr ?? this.pageLabel(this.pageId())
      : data.pageLabelEn ?? this.pageLabel(this.pageId());
    return `${moduleLabel} — ${pageLabel}`;
  });

  readonly description = computed(() => {
    const data = this.routeData() as DnaRouteData;
    return this.cfg.locale() === 'ar'
      ? data.descriptionAr ?? ''
      : data.descriptionEn ?? '';
  });

  pageLabel(pageId: string): string {
    const page = SHAHIN_DNA_PAGE_DEFS.find((entry) => entry.id === pageId);
    if (!page) return pageId;
    return this.cfg.locale() === 'ar' ? page.labelAr : page.labelEn;
  }
}