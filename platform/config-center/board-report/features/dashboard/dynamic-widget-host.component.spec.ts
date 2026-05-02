import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { DynamicWidgetHostComponent } from './dynamic-widget-host.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('DynamicWidgetHostComponent', () => {
  let component: DynamicWidgetHostComponent;
  let fixture: ComponentFixture<DynamicWidgetHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DynamicWidgetHostComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(DynamicWidgetHostComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
