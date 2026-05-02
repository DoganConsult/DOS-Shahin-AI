import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { WidgetOutletComponent } from './widget-outlet.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('WidgetOutletComponent', () => {
  let component: WidgetOutletComponent;
  let fixture: ComponentFixture<WidgetOutletComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WidgetOutletComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(WidgetOutletComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
