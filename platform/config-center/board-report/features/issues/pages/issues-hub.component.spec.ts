import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { IssuesHubComponent } from './issues-hub.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('IssuesHubComponent', () => {
  let component: IssuesHubComponent;
  let fixture: ComponentFixture<IssuesHubComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IssuesHubComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(IssuesHubComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
