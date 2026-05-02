import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { FoundationPoliciesComponent } from './foundation-policies.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('FoundationPoliciesComponent', () => {
  let component: FoundationPoliciesComponent;
  let fixture: ComponentFixture<FoundationPoliciesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FoundationPoliciesComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(FoundationPoliciesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
