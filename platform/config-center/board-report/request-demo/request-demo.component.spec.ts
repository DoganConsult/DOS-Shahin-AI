import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { RequestDemoComponent } from './request-demo.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('RequestDemoComponent', () => {
  let component: RequestDemoComponent;
  let fixture: ComponentFixture<RequestDemoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RequestDemoComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(RequestDemoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
