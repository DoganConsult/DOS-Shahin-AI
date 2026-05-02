import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { KpiTilesComponent } from './kpi-tiles.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('KpiTilesComponent', () => {
  let component: KpiTilesComponent;
  let fixture: ComponentFixture<KpiTilesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KpiTilesComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(KpiTilesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
