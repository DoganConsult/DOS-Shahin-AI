import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { FoundationUsersTableComponent } from './foundation-users-table.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('FoundationUsersTableComponent', () => {
  let component: FoundationUsersTableComponent;
  let fixture: ComponentFixture<FoundationUsersTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FoundationUsersTableComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(FoundationUsersTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
