import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { LifecycleBarComponent } from './lifecycle-bar.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('LifecycleBarComponent', () => {
  let component: LifecycleBarComponent;
  let fixture: ComponentFixture<LifecycleBarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LifecycleBarComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(LifecycleBarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
