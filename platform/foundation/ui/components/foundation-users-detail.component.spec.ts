import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { FoundationUsersDetailComponent } from './foundation-users-detail.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('FoundationUsersDetailComponent', () => {
  let component: FoundationUsersDetailComponent;
  let fixture: ComponentFixture<FoundationUsersDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FoundationUsersDetailComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(FoundationUsersDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
