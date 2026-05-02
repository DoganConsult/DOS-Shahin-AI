import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ContractTestsComponent } from './contract-tests.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('ContractTestsComponent', () => {
  let component: ContractTestsComponent;
  let fixture: ComponentFixture<ContractTestsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContractTestsComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(ContractTestsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
