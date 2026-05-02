import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { KpiDetailComponent } from './kpi-detail.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('KpiDetailComponent', () => {
  let component: KpiDetailComponent;
  let fixture: ComponentFixture<KpiDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KpiDetailComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(KpiDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
