import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { BootstrapWidgetComponent } from './bootstrap-widget.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('BootstrapWidgetComponent', () => {
  let component: BootstrapWidgetComponent;
  let fixture: ComponentFixture<BootstrapWidgetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BootstrapWidgetComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(BootstrapWidgetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
