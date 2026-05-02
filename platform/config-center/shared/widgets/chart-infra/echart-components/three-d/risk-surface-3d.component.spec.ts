import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { RiskSurface-3dComponent } from './risk-surface-3d.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('RiskSurface-3dComponent', () => {
  let component: RiskSurface-3dComponent;
  let fixture: ComponentFixture<RiskSurface-3dComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RiskSurface-3dComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(RiskSurface-3dComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
