import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AiObservationListComponent } from './ai-observation-list.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AiObservationListComponent', () => {
  let component: AiObservationListComponent;
  let fixture: ComponentFixture<AiObservationListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiObservationListComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AiObservationListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
