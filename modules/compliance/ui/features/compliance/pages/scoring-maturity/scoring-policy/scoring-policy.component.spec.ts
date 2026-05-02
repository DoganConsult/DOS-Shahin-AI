import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ScoringPolicyComponent } from './scoring-policy.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('ScoringPolicyComponent', () => {
  let component: ScoringPolicyComponent;
  let fixture: ComponentFixture<ScoringPolicyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ScoringPolicyComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(ScoringPolicyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
