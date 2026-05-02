import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ReportBuilderTemplateSelectorComponent } from './report-builder-template-selector.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('ReportBuilderTemplateSelectorComponent', () => {
  let component: ReportBuilderTemplateSelectorComponent;
  let fixture: ComponentFixture<ReportBuilderTemplateSelectorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportBuilderTemplateSelectorComponent], // Assuming standalone component
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: { get: () => '1' } },
            params: of({ id: '1' }),
            queryParams: of({})
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ReportBuilderTemplateSelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
