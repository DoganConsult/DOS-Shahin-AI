import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AppHomeRedirectComponent } from './app-home-redirect.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AppHomeRedirectComponent', () => {
  let component: AppHomeRedirectComponent;
  let fixture: ComponentFixture<AppHomeRedirectComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppHomeRedirectComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AppHomeRedirectComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
