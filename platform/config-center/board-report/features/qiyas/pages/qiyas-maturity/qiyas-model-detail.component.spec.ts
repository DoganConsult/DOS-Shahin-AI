import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { QiyasModelDetailComponent } from './qiyas-model-detail.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('QiyasModelDetailComponent', () => {
  let component: QiyasModelDetailComponent;
  let fixture: ComponentFixture<QiyasModelDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QiyasModelDetailComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(QiyasModelDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
