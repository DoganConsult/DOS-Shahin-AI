import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { IndustriesSectionComponent } from './industries-section.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('IndustriesSectionComponent', () => {
  let component: IndustriesSectionComponent;
  let fixture: ComponentFixture<IndustriesSectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IndustriesSectionComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(IndustriesSectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
