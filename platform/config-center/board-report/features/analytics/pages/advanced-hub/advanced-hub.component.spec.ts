import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AdvancedHubComponent } from './advanced-hub.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AdvancedHubComponent', () => {
  let component: AdvancedHubComponent;
  let fixture: ComponentFixture<AdvancedHubComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdvancedHubComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AdvancedHubComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
