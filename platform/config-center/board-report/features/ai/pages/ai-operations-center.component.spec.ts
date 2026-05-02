import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AiOperationsCenterComponent } from './ai-operations-center.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AiOperationsCenterComponent', () => {
  let component: AiOperationsCenterComponent;
  let fixture: ComponentFixture<AiOperationsCenterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiOperationsCenterComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AiOperationsCenterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
