import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { QiyasModelsComponent } from './qiyas-models.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('QiyasModelsComponent', () => {
  let component: QiyasModelsComponent;
  let fixture: ComponentFixture<QiyasModelsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QiyasModelsComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(QiyasModelsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
