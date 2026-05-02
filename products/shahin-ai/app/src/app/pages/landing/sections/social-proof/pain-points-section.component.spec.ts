import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PainPointsSectionComponent } from './pain-points-section.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('PainPointsSectionComponent', () => {
  let component: PainPointsSectionComponent;
  let fixture: ComponentFixture<PainPointsSectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PainPointsSectionComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(PainPointsSectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
