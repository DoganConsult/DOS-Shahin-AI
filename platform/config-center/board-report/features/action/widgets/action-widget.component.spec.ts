import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActionWidgetComponent } from './action-widget.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('ActionWidgetComponent', () => {
  let component: ActionWidgetComponent;
  let fixture: ComponentFixture<ActionWidgetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActionWidgetComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(ActionWidgetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
