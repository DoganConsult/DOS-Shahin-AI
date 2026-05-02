import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { WidgetShowcaseSectionComponent } from './widget-showcase-section.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('WidgetShowcaseSectionComponent', () => {
  let component: WidgetShowcaseSectionComponent;
  let fixture: ComponentFixture<WidgetShowcaseSectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WidgetShowcaseSectionComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(WidgetShowcaseSectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
