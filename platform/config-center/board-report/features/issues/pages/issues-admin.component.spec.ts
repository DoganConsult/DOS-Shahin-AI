import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { IssuesAdminComponent } from './issues-admin.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('IssuesAdminComponent', () => {
  let component: IssuesAdminComponent;
  let fixture: ComponentFixture<IssuesAdminComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IssuesAdminComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(IssuesAdminComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
