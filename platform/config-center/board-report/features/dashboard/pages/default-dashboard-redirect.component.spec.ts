import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { DefaultDashboardRedirectComponent } from './default-dashboard-redirect.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('DefaultDashboardRedirectComponent', () => {
  let component: DefaultDashboardRedirectComponent;
  let fixture: ComponentFixture<DefaultDashboardRedirectComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DefaultDashboardRedirectComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(DefaultDashboardRedirectComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
