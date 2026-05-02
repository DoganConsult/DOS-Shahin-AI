import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ScoringRulesTableComponent } from './scoring-rules-table.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('ScoringRulesTableComponent', () => {
  let component: ScoringRulesTableComponent;
  let fixture: ComponentFixture<ScoringRulesTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ScoringRulesTableComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(ScoringRulesTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
