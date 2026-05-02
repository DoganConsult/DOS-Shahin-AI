import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { GuidedTourComponent } from './guided-tour.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('GuidedTourComponent', () => {
  let component: GuidedTourComponent;
  let fixture: ComponentFixture<GuidedTourComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GuidedTourComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(GuidedTourComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
