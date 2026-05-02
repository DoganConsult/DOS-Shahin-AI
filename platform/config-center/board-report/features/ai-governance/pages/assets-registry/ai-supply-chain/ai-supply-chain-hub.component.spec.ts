import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AiSupplyChainHubComponent } from './ai-supply-chain-hub.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AiSupplyChainHubComponent', () => {
  let component: AiSupplyChainHubComponent;
  let fixture: ComponentFixture<AiSupplyChainHubComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiSupplyChainHubComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AiSupplyChainHubComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
