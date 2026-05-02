import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AiPostMarketHubComponent } from './ai-post-market-hub.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AiPostMarketHubComponent', () => {
  let component: AiPostMarketHubComponent;
  let fixture: ComponentFixture<AiPostMarketHubComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiPostMarketHubComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AiPostMarketHubComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
