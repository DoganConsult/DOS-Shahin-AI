import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AiHitlEnhancedComponent } from './ai-hitl-enhanced.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AiHitlEnhancedComponent', () => {
  let component: AiHitlEnhancedComponent;
  let fixture: ComponentFixture<AiHitlEnhancedComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiHitlEnhancedComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AiHitlEnhancedComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
