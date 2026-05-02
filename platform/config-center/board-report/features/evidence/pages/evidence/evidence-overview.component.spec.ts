import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { EvidenceOverviewComponent } from './evidence-overview.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('EvidenceOverviewComponent', () => {
  let component: EvidenceOverviewComponent;
  let fixture: ComponentFixture<EvidenceOverviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EvidenceOverviewComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(EvidenceOverviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
