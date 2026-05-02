import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { DomainsTabComponent } from './domains-tab.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('DomainsTabComponent', () => {
  let component: DomainsTabComponent;
  let fixture: ComponentFixture<DomainsTabComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DomainsTabComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(DomainsTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
