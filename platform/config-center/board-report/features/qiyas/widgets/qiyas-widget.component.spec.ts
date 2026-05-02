import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { QiyasWidgetComponent } from './qiyas-widget.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('QiyasWidgetComponent', () => {
  let component: QiyasWidgetComponent;
  let fixture: ComponentFixture<QiyasWidgetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QiyasWidgetComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(QiyasWidgetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
