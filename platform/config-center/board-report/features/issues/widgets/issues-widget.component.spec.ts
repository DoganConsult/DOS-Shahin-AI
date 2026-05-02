import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { IssuesWidgetComponent } from './issues-widget.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('IssuesWidgetComponent', () => {
  let component: IssuesWidgetComponent;
  let fixture: ComponentFixture<IssuesWidgetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IssuesWidgetComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(IssuesWidgetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
