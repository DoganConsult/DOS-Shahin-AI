import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { RiskConstellationComponent } from './risk-constellation.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('RiskConstellationComponent', () => {
  let component: RiskConstellationComponent;
  let fixture: ComponentFixture<RiskConstellationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RiskConstellationComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(RiskConstellationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
