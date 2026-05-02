import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { GrcStatWidgetComponent } from './grc-stat-widget.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('GrcStatWidgetComponent', () => {
  let component: GrcStatWidgetComponent;
  let fixture: ComponentFixture<GrcStatWidgetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GrcStatWidgetComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(GrcStatWidgetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
