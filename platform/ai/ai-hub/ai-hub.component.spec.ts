import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AiHubComponent } from './ai-hub.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AiHubComponent', () => {
  let component: AiHubComponent;
  let fixture: ComponentFixture<AiHubComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiHubComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AiHubComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
