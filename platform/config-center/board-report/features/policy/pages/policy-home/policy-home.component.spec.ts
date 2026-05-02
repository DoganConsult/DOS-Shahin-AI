import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PolicyHomeComponent } from './policy-home.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('PolicyHomeComponent', () => {
  let component: PolicyHomeComponent;
  let fixture: ComponentFixture<PolicyHomeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PolicyHomeComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(PolicyHomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
