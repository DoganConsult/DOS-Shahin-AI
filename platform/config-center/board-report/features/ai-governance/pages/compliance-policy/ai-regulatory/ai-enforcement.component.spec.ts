import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AiEnforcementComponent } from './ai-enforcement.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AiEnforcementComponent', () => {
  let component: AiEnforcementComponent;
  let fixture: ComponentFixture<AiEnforcementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiEnforcementComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AiEnforcementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
