import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { QuantumCryptoInventoryComponent } from './quantum-crypto-inventory.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('QuantumCryptoInventoryComponent', () => {
  let component: QuantumCryptoInventoryComponent;
  let fixture: ComponentFixture<QuantumCryptoInventoryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuantumCryptoInventoryComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(QuantumCryptoInventoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
