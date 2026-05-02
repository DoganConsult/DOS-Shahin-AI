import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { QiyasRespondentsComponent } from './qiyas-respondents.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('QiyasRespondentsComponent', () => {
  let component: QiyasRespondentsComponent;
  let fixture: ComponentFixture<QiyasRespondentsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QiyasRespondentsComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(QiyasRespondentsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
