import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { QiyasQuestionBankComponent } from './qiyas-question-bank.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('QiyasQuestionBankComponent', () => {
  let component: QiyasQuestionBankComponent;
  let fixture: ComponentFixture<QiyasQuestionBankComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QiyasQuestionBankComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(QiyasQuestionBankComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
