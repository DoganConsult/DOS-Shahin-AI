import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { WidgetShellComponent } from './widget-shell.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('WidgetShellComponent', () => {
  let component: WidgetShellComponent;
  let fixture: ComponentFixture<WidgetShellComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WidgetShellComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(WidgetShellComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
