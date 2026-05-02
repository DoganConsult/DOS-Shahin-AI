import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { DomainScoreCardComponent } from './domain-score-card.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('DomainScoreCardComponent', () => {
  let component: DomainScoreCardComponent;
  let fixture: ComponentFixture<DomainScoreCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DomainScoreCardComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(DomainScoreCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
