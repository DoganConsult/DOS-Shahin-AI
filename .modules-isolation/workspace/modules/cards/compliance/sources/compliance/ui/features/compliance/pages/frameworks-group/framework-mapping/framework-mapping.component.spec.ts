import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { FrameworkMappingComponent } from './framework-mapping.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('FrameworkMappingComponent', () => {
  let component: FrameworkMappingComponent;
  let fixture: ComponentFixture<FrameworkMappingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FrameworkMappingComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(FrameworkMappingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
