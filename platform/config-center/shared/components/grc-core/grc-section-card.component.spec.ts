import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { GrcSectionCardComponent } from './grc-section-card.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('GrcSectionCardComponent', () => {
  let component: GrcSectionCardComponent;
  let fixture: ComponentFixture<GrcSectionCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GrcSectionCardComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(GrcSectionCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
