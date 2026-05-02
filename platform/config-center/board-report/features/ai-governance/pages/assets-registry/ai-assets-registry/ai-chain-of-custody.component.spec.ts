import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AiChainOfCustodyComponent } from './ai-chain-of-custody.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AiChainOfCustodyComponent', () => {
  let component: AiChainOfCustodyComponent;
  let fixture: ComponentFixture<AiChainOfCustodyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiChainOfCustodyComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AiChainOfCustodyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
