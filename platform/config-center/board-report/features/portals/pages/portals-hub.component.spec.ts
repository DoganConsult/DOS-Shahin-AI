import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PortalsHubComponent } from './portals-hub.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('PortalsHubComponent', () => {
  let component: PortalsHubComponent;
  let fixture: ComponentFixture<PortalsHubComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PortalsHubComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(PortalsHubComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
