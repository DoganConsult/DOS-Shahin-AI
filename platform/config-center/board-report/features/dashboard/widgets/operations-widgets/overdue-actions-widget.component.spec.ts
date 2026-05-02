import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { OverdueActionsWidgetComponent } from './overdue-actions-widget.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('OverdueActionsWidgetComponent', () => {
  let component: OverdueActionsWidgetComponent;
  let fixture: ComponentFixture<OverdueActionsWidgetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OverdueActionsWidgetComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(OverdueActionsWidgetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
