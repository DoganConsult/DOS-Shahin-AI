import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { SlideInPanelComponent } from './slide-in-panel.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('SlideInPanelComponent', () => {
  let component: SlideInPanelComponent;
  let fixture: ComponentFixture<SlideInPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SlideInPanelComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(SlideInPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
