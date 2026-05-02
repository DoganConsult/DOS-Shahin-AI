import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ExceptionRiskLinksComponent } from './exception-risk-links.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('ExceptionRiskLinksComponent', () => {
  let component: ExceptionRiskLinksComponent;
  let fixture: ComponentFixture<ExceptionRiskLinksComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExceptionRiskLinksComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(ExceptionRiskLinksComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
