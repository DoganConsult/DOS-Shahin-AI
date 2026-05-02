import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PolicyCodeComponent } from './policy-code.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('PolicyCodeComponent', () => {
  let component: PolicyCodeComponent;
  let fixture: ComponentFixture<PolicyCodeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PolicyCodeComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(PolicyCodeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
