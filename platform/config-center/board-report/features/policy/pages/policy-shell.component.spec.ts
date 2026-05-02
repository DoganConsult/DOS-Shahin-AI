import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PolicyShellComponent } from './policy-shell.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('PolicyShellComponent', () => {
  let component: PolicyShellComponent;
  let fixture: ComponentFixture<PolicyShellComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PolicyShellComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(PolicyShellComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
