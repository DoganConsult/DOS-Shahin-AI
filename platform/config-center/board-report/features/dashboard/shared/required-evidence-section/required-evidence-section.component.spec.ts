import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { RequiredEvidenceSectionComponent } from './required-evidence-section.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('RequiredEvidenceSectionComponent', () => {
  let component: RequiredEvidenceSectionComponent;
  let fixture: ComponentFixture<RequiredEvidenceSectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RequiredEvidenceSectionComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(RequiredEvidenceSectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
