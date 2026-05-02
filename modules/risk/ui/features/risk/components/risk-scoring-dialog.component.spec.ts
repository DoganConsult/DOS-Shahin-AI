import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { RiskScoringDialogComponent } from './risk-scoring-dialog.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('RiskScoringDialogComponent', () => {
  let component: RiskScoringDialogComponent;
  let fixture: ComponentFixture<RiskScoringDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RiskScoringDialogComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(RiskScoringDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
