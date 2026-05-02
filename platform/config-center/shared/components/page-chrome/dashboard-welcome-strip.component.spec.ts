import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { DashboardWelcomeStripComponent } from './dashboard-welcome-strip.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('DashboardWelcomeStripComponent', () => {
  let component: DashboardWelcomeStripComponent;
  let fixture: ComponentFixture<DashboardWelcomeStripComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardWelcomeStripComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(DashboardWelcomeStripComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
