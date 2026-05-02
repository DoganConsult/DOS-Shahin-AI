import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { KpiCardGridComponent } from './kpi-card-grid.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('KpiCardGridComponent', () => {
  let component: KpiCardGridComponent;
  let fixture: ComponentFixture<KpiCardGridComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KpiCardGridComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(KpiCardGridComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
