import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { RemediationBoardComponent } from './remediation-board.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('RemediationBoardComponent', () => {
  let component: RemediationBoardComponent;
  let fixture: ComponentFixture<RemediationBoardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RemediationBoardComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(RemediationBoardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
