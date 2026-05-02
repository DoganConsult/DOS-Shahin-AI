import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PolicyVersionsComponent } from './policy-versions.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('PolicyVersionsComponent', () => {
  let component: PolicyVersionsComponent;
  let fixture: ComponentFixture<PolicyVersionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PolicyVersionsComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(PolicyVersionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
