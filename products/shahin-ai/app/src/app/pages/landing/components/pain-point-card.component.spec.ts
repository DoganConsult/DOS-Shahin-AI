import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PainPointCardComponent } from './pain-point-card.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('PainPointCardComponent', () => {
  let component: PainPointCardComponent;
  let fixture: ComponentFixture<PainPointCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PainPointCardComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(PainPointCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
