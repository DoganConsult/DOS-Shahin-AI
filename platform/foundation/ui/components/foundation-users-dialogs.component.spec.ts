import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { FoundationUsersDialogsComponent } from './foundation-users-dialogs.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('FoundationUsersDialogsComponent', () => {
  let component: FoundationUsersDialogsComponent;
  let fixture: ComponentFixture<FoundationUsersDialogsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FoundationUsersDialogsComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(FoundationUsersDialogsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
