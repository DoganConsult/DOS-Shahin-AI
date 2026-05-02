import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AiBoardSummaryComponent } from './ai-board-summary.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AiBoardSummaryComponent', () => {
  let component: AiBoardSummaryComponent;
  let fixture: ComponentFixture<AiBoardSummaryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiBoardSummaryComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AiBoardSummaryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
