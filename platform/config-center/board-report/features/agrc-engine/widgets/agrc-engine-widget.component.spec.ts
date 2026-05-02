import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AgrcEngineWidgetComponent } from './agrc-engine-widget.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AgrcEngineWidgetComponent', () => {
  let component: AgrcEngineWidgetComponent;
  let fixture: ComponentFixture<AgrcEngineWidgetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AgrcEngineWidgetComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AgrcEngineWidgetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
