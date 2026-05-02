import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { SignaturesComponent } from './signatures.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('SignaturesComponent', () => {
  let component: SignaturesComponent;
  let fixture: ComponentFixture<SignaturesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SignaturesComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(SignaturesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
