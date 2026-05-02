import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { SparklineWidgetComponent } from './sparkline-widget.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('SparklineWidgetComponent', () => {
  let component: SparklineWidgetComponent;
  let fixture: ComponentFixture<SparklineWidgetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SparklineWidgetComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(SparklineWidgetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
