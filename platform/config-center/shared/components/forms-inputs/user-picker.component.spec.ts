import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { UserPickerComponent } from './user-picker.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('UserPickerComponent', () => {
  let component: UserPickerComponent;
  let fixture: ComponentFixture<UserPickerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserPickerComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(UserPickerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
