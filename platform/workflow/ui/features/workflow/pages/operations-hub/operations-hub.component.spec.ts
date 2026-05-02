import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { OperationsHubComponent } from './operations-hub.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('OperationsHubComponent', () => {
  let component: OperationsHubComponent;
  let fixture: ComponentFixture<OperationsHubComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OperationsHubComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(OperationsHubComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
