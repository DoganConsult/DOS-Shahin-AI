import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { KsaHubComponent } from './ksa-hub.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('KsaHubComponent', () => {
  let component: KsaHubComponent;
  let fixture: ComponentFixture<KsaHubComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KsaHubComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(KsaHubComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
