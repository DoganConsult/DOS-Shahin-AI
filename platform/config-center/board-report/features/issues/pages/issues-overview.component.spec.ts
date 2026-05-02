import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { IssuesOverviewComponent } from './issues-overview.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('IssuesOverviewComponent', () => {
  let component: IssuesOverviewComponent;
  let fixture: ComponentFixture<IssuesOverviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IssuesOverviewComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(IssuesOverviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
