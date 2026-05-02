import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ControlLifecycleComponent } from './control-lifecycle.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('ControlLifecycleComponent', () => {
  let component: ControlLifecycleComponent;
  let fixture: ComponentFixture<ControlLifecycleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ControlLifecycleComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(ControlLifecycleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
