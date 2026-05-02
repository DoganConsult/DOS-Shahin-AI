import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ExceptionCompensatingControlsComponent } from './exception-compensating-controls.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('ExceptionCompensatingControlsComponent', () => {
  let component: ExceptionCompensatingControlsComponent;
  let fixture: ComponentFixture<ExceptionCompensatingControlsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExceptionCompensatingControlsComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(ExceptionCompensatingControlsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
