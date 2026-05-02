import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PainCardsComponent } from './pain-cards.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('PainCardsComponent', () => {
  let component: PainCardsComponent;
  let fixture: ComponentFixture<PainCardsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PainCardsComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(PainCardsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
