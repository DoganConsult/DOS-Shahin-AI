import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { GrcFormFieldComponent } from './grc-form-field.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('GrcFormFieldComponent', () => {
  let component: GrcFormFieldComponent;
  let fixture: ComponentFixture<GrcFormFieldComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GrcFormFieldComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(GrcFormFieldComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
