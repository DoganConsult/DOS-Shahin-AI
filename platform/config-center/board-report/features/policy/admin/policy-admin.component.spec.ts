import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PolicyAdminComponent } from './policy-admin.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('PolicyAdminComponent', () => {
  let component: PolicyAdminComponent;
  let fixture: ComponentFixture<PolicyAdminComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PolicyAdminComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(PolicyAdminComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
