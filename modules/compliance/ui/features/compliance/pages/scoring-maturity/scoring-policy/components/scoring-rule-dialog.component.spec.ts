import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ScoringRuleDialogComponent } from './scoring-rule-dialog.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('ScoringRuleDialogComponent', () => {
  let component: ScoringRuleDialogComponent;
  let fixture: ComponentFixture<ScoringRuleDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ScoringRuleDialogComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(ScoringRuleDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
