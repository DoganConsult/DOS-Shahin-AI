import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { RiskDetailComponent } from './risk-detail.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('RiskDetailComponent', () => {
  let component: RiskDetailComponent;
  let fixture: ComponentFixture<RiskDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RiskDetailComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(RiskDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
