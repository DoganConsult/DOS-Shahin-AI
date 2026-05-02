import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NetworkGraphEnhancedComponent } from './network-graph-enhanced.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('NetworkGraphEnhancedComponent', () => {
  let component: NetworkGraphEnhancedComponent;
  let fixture: ComponentFixture<NetworkGraphEnhancedComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NetworkGraphEnhancedComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(NetworkGraphEnhancedComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
