import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { DeptPickerComponent } from './dept-picker.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('DeptPickerComponent', () => {
  let component: DeptPickerComponent;
  let fixture: ComponentFixture<DeptPickerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeptPickerComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(DeptPickerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
