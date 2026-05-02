import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AiPolicyRulesComponent } from './ai-policy-rules.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AiPolicyRulesComponent', () => {
  let component: AiPolicyRulesComponent;
  let fixture: ComponentFixture<AiPolicyRulesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiPolicyRulesComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AiPolicyRulesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
