import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { IssuesDetailComponent } from './issues-detail.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('IssuesDetailComponent', () => {
  let component: IssuesDetailComponent;
  let fixture: ComponentFixture<IssuesDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IssuesDetailComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(IssuesDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
