import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MobileStatsGridComponent } from './mobile-stats-grid.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('MobileStatsGridComponent', () => {
  let component: MobileStatsGridComponent;
  let fixture: ComponentFixture<MobileStatsGridComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MobileStatsGridComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(MobileStatsGridComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
