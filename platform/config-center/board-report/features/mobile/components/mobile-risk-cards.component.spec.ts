import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MobileRiskCardsComponent } from './mobile-risk-cards.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('MobileRiskCardsComponent', () => {
  let component: MobileRiskCardsComponent;
  let fixture: ComponentFixture<MobileRiskCardsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MobileRiskCardsComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(MobileRiskCardsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
