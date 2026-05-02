import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { DrillThroughPanelComponent } from './drill-through-panel.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('DrillThroughPanelComponent', () => {
  let component: DrillThroughPanelComponent;
  let fixture: ComponentFixture<DrillThroughPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DrillThroughPanelComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(DrillThroughPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
