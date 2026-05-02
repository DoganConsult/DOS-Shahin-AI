import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PhilosophySectionComponent } from './philosophy-section.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('PhilosophySectionComponent', () => {
  let component: PhilosophySectionComponent;
  let fixture: ComponentFixture<PhilosophySectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PhilosophySectionComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(PhilosophySectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
