import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AdminWidgetComponent } from './admin-widget.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AdminWidgetComponent', () => {
  let component: AdminWidgetComponent;
  let fixture: ComponentFixture<AdminWidgetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminWidgetComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AdminWidgetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
