import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { FoundationDelegationsComponent } from './foundation-delegations.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('FoundationDelegationsComponent', () => {
  let component: FoundationDelegationsComponent;
  let fixture: ComponentFixture<FoundationDelegationsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FoundationDelegationsComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(FoundationDelegationsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
