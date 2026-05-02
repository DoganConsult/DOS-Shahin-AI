import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PolicyWorkQueueComponent } from './policy-work-queue.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('PolicyWorkQueueComponent', () => {
  let component: PolicyWorkQueueComponent;
  let fixture: ComponentFixture<PolicyWorkQueueComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PolicyWorkQueueComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(PolicyWorkQueueComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
