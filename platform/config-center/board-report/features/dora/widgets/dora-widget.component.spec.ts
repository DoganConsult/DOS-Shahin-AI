import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { DoraWidgetComponent } from './dora-widget.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('DoraWidgetComponent', () => {
  let component: DoraWidgetComponent;
  let fixture: ComponentFixture<DoraWidgetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DoraWidgetComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(DoraWidgetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
