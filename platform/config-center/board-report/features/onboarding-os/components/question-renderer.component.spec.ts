import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { QuestionRendererComponent } from './question-renderer.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('QuestionRendererComponent', () => {
  let component: QuestionRendererComponent;
  let fixture: ComponentFixture<QuestionRendererComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuestionRendererComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(QuestionRendererComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
