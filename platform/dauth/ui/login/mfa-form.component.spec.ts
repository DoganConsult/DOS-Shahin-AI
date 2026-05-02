import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MfaFormComponent } from './mfa-form.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('MfaFormComponent', () => {
  let component: MfaFormComponent;
  let fixture: ComponentFixture<MfaFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MfaFormComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(MfaFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
