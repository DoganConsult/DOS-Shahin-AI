import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PolicyPublicationsComponent } from './policy-publications.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('PolicyPublicationsComponent', () => {
  let component: PolicyPublicationsComponent;
  let fixture: ComponentFixture<PolicyPublicationsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PolicyPublicationsComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(PolicyPublicationsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
