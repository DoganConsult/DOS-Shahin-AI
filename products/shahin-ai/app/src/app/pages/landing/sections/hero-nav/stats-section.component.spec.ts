import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { StatsSectionComponent } from './stats-section.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('StatsSectionComponent', () => {
  let component: StatsSectionComponent;
  let fixture: ComponentFixture<StatsSectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatsSectionComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(StatsSectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
