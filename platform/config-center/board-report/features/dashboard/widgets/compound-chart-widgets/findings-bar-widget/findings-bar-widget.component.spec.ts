import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { FindingsBarWidgetComponent } from './findings-bar-widget.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('FindingsBarWidgetComponent', () => {
  let component: FindingsBarWidgetComponent;
  let fixture: ComponentFixture<FindingsBarWidgetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FindingsBarWidgetComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(FindingsBarWidgetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
