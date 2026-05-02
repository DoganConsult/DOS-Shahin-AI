import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { LifecycleTabComponent } from './lifecycle-tab.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('LifecycleTabComponent', () => {
  let component: LifecycleTabComponent;
  let fixture: ComponentFixture<LifecycleTabComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LifecycleTabComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(LifecycleTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
