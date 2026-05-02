import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ReportBuilderGenerateDeliverComponent } from './report-builder-generate-deliver.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('ReportBuilderGenerateDeliverComponent', () => {
  let component: ReportBuilderGenerateDeliverComponent;
  let fixture: ComponentFixture<ReportBuilderGenerateDeliverComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportBuilderGenerateDeliverComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(ReportBuilderGenerateDeliverComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
