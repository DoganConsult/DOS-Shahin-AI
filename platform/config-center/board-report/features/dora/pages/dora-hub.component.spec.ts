import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { DoraHubComponent } from './dora-hub.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('DoraHubComponent', () => {
  let component: DoraHubComponent;
  let fixture: ComponentFixture<DoraHubComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DoraHubComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(DoraHubComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
