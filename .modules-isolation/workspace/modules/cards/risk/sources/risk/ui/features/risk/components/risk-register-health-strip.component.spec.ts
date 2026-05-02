import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { RiskRegisterHealthStripComponent } from './risk-register-health-strip.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('RiskRegisterHealthStripComponent', () => {
  let component: RiskRegisterHealthStripComponent;
  let fixture: ComponentFixture<RiskRegisterHealthStripComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RiskRegisterHealthStripComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(RiskRegisterHealthStripComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
