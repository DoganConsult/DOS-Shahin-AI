import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AiGoNoGoComponent } from './ai-go-no-go.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AiGoNoGoComponent', () => {
  let component: AiGoNoGoComponent;
  let fixture: ComponentFixture<AiGoNoGoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiGoNoGoComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AiGoNoGoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
