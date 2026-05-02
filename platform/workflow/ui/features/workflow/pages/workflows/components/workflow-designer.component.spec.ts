import { Injectable } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { WorkflowDesignerComponent } from './workflow-designer.component';
import { WorkflowDesignerCanvasComponent } from './workflow-designer-canvas.component';
import { WorkflowDesignerPaletteComponent } from './workflow-designer-palette.component';
import { WorkflowDesignerConfigPanelComponent } from './workflow-designer-config-panel.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { MessageService, ConfirmationService } from 'primeng/api';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';

/** Vitest/JIT: external styleUrls are not resolved before NG_COMP_DEF getter; strip for unit tests. */
const noExternalStyles = { styleUrls: [] as string[] };

@Injectable()
class MockI18nService {
  translate(key: string): string {
    return key;
  }
  t(key: string): string {
    return key;
  }
  localize(en: string): string {
    return en;
  }
  pbt(): string {
    return '';
  }
  getBilingualField(): string {
    return '';
  }
  formatNumber(value: number): string {
    return String(value);
  }
  formatDate(date: Date | string): string {
    return typeof date === 'string' ? date : date.toISOString();
  }
  switchLanguage(): void {}
}

describe('WorkflowDesignerComponent', () => {
  let component: WorkflowDesignerComponent;
  let fixture: ComponentFixture<WorkflowDesignerComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [WorkflowDesignerComponent], // Assuming standalone component
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        MessageService,
        ConfirmationService,
        { provide: I18nService, useClass: MockI18nService },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: { get: () => '1' } },
            params: of({ id: '1' }),
            queryParams: of({})
          }
        }
      ]
    })
      .overrideComponent(WorkflowDesignerComponent, { set: noExternalStyles })
      .overrideComponent(WorkflowDesignerCanvasComponent, {
        set: {
          ...noExternalStyles,
          providers: [{ provide: I18nService, useClass: MockI18nService }],
        },
      })
      .overrideComponent(WorkflowDesignerPaletteComponent, { set: noExternalStyles })
      .overrideComponent(WorkflowDesignerConfigPanelComponent, { set: noExternalStyles });
    await TestBed.compileComponents();

    fixture = TestBed.createComponent(WorkflowDesignerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
