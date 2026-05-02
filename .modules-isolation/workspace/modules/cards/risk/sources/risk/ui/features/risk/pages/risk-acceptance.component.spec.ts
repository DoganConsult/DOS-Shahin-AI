import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { RiskAcceptanceComponent } from './risk-acceptance.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('RiskAcceptanceComponent', () => {
  let component: RiskAcceptanceComponent;
  let fixture: ComponentFixture<RiskAcceptanceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RiskAcceptanceComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(RiskAcceptanceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
