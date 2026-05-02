import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { InferenceAdminComponent } from './inference-admin.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('InferenceAdminComponent', () => {
  let component: InferenceAdminComponent;
  let fixture: ComponentFixture<InferenceAdminComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InferenceAdminComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(InferenceAdminComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
