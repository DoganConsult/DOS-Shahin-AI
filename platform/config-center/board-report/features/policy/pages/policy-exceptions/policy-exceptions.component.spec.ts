import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PolicyExceptionsComponent } from './policy-exceptions.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('PolicyExceptionsComponent', () => {
  let component: PolicyExceptionsComponent;
  let fixture: ComponentFixture<PolicyExceptionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PolicyExceptionsComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(PolicyExceptionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
