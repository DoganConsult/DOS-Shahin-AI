import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AiSupplyAgreementsComponent } from './ai-supply-agreements.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AiSupplyAgreementsComponent', () => {
  let component: AiSupplyAgreementsComponent;
  let fixture: ComponentFixture<AiSupplyAgreementsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiSupplyAgreementsComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AiSupplyAgreementsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
