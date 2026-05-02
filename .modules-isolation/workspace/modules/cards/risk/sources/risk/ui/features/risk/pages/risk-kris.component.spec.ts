import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { RiskKrisComponent } from './risk-kris.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('RiskKrisComponent', () => {
  let component: RiskKrisComponent;
  let fixture: ComponentFixture<RiskKrisComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RiskKrisComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(RiskKrisComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
