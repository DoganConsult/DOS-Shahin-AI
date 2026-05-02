import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { FoundationDataProcessingComponent } from './foundation-data-processing.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('FoundationDataProcessingComponent', () => {
  let component: FoundationDataProcessingComponent;
  let fixture: ComponentFixture<FoundationDataProcessingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FoundationDataProcessingComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(FoundationDataProcessingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
