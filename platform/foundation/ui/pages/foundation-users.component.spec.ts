import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { FoundationUsersComponent } from './foundation-users.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('FoundationUsersComponent', () => {
  let component: FoundationUsersComponent;
  let fixture: ComponentFixture<FoundationUsersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FoundationUsersComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(FoundationUsersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
