import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { InboxWidgetComponent } from './inbox-widget.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('InboxWidgetComponent', () => {
  let component: InboxWidgetComponent;
  let fixture: ComponentFixture<InboxWidgetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InboxWidgetComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(InboxWidgetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
