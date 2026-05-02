import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { WebhookManagerComponent } from './webhook-manager.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('WebhookManagerComponent', () => {
  let component: WebhookManagerComponent;
  let fixture: ComponentFixture<WebhookManagerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WebhookManagerComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(WebhookManagerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
