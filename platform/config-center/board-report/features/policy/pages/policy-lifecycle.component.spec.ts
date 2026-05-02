import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PolicyLifecycleComponent } from './policy-lifecycle.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('PolicyLifecycleComponent', () => {
  let component: PolicyLifecycleComponent;
  let fixture: ComponentFixture<PolicyLifecycleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PolicyLifecycleComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(PolicyLifecycleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
