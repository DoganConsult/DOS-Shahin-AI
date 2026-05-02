import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { QiyasBenchmarksComponent } from './qiyas-benchmarks.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('QiyasBenchmarksComponent', () => {
  let component: QiyasBenchmarksComponent;
  let fixture: ComponentFixture<QiyasBenchmarksComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QiyasBenchmarksComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(QiyasBenchmarksComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
