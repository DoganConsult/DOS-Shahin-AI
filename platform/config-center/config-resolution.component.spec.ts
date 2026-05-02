import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ConfigResolutionComponent } from './config-resolution.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('ConfigResolutionComponent', () => {
  let component: ConfigResolutionComponent;
  let fixture: ComponentFixture<ConfigResolutionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfigResolutionComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(ConfigResolutionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
