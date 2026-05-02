import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { SolutionsSectionComponent } from './solutions-section.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('SolutionsSectionComponent', () => {
  let component: SolutionsSectionComponent;
  let fixture: ComponentFixture<SolutionsSectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SolutionsSectionComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(SolutionsSectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
