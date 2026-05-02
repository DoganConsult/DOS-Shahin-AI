import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ExceptionManagementComponent } from './exception-management.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('ExceptionManagementComponent', () => {
  let component: ExceptionManagementComponent;
  let fixture: ComponentFixture<ExceptionManagementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExceptionManagementComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(ExceptionManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
