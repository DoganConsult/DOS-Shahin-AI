import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PlatformRegistryComponent } from './platform-registry.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('PlatformRegistryComponent', () => {
  let component: PlatformRegistryComponent;
  let fixture: ComponentFixture<PlatformRegistryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlatformRegistryComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(PlatformRegistryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
