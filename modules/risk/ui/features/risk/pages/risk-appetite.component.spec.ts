import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { RiskAppetiteComponent } from './risk-appetite.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('RiskAppetiteComponent', () => {
  let component: RiskAppetiteComponent;
  let fixture: ComponentFixture<RiskAppetiteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RiskAppetiteComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(RiskAppetiteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
