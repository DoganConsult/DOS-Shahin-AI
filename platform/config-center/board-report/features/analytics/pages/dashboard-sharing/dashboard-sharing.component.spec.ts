import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { DashboardSharingComponent } from './dashboard-sharing.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('DashboardSharingComponent', () => {
  let component: DashboardSharingComponent;
  let fixture: ComponentFixture<DashboardSharingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardSharingComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(DashboardSharingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
