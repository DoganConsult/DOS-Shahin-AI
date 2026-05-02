import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { EthicsIntegrityComponent } from './ethics-integrity.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('EthicsIntegrityComponent', () => {
  let component: EthicsIntegrityComponent;
  let fixture: ComponentFixture<EthicsIntegrityComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EthicsIntegrityComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(EthicsIntegrityComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
