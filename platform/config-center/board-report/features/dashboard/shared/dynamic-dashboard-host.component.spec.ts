import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { DynamicDashboardHostComponent } from './dynamic-dashboard-host.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('DynamicDashboardHostComponent', () => {
  let component: DynamicDashboardHostComponent;
  let fixture: ComponentFixture<DynamicDashboardHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DynamicDashboardHostComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(DynamicDashboardHostComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
