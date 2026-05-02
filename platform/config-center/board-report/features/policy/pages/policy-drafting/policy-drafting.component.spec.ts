import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PolicyDraftingComponent } from './policy-drafting.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('PolicyDraftingComponent', () => {
  let component: PolicyDraftingComponent;
  let fixture: ComponentFixture<PolicyDraftingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PolicyDraftingComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(PolicyDraftingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
