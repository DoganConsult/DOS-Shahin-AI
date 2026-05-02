import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PolicyTableComponent } from './policy-table.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('PolicyTableComponent', () => {
  let component: PolicyTableComponent;
  let fixture: ComponentFixture<PolicyTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PolicyTableComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(PolicyTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
