import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { FrameworksTabComponent } from './frameworks-tab.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('FrameworksTabComponent', () => {
  let component: FrameworksTabComponent;
  let fixture: ComponentFixture<FrameworksTabComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FrameworksTabComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(FrameworksTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
