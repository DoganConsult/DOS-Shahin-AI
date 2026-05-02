import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { IntelligenceHubComponent } from './intelligence-hub.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('IntelligenceHubComponent', () => {
  let component: IntelligenceHubComponent;
  let fixture: ComponentFixture<IntelligenceHubComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IntelligenceHubComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(IntelligenceHubComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
