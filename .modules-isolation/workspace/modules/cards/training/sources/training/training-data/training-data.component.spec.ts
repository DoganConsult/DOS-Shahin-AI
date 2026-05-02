import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TrainingDataComponent } from './training-data.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('TrainingDataComponent', () => {
  let component: TrainingDataComponent;
  let fixture: ComponentFixture<TrainingDataComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TrainingDataComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(TrainingDataComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
