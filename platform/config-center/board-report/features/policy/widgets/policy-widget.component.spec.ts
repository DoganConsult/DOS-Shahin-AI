import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PolicyWidgetComponent } from './policy-widget.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('PolicyWidgetComponent', () => {
  let component: PolicyWidgetComponent;
  let fixture: ComponentFixture<PolicyWidgetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PolicyWidgetComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(PolicyWidgetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
