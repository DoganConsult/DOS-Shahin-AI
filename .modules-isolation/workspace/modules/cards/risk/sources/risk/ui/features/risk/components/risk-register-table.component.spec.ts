import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { RiskRegisterTableComponent } from './risk-register-table.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('RiskRegisterTableComponent', () => {
  let component: RiskRegisterTableComponent;
  let fixture: ComponentFixture<RiskRegisterTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RiskRegisterTableComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(RiskRegisterTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
