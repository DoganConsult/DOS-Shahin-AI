import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ConfigHealthComponent } from './config-health.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('ConfigHealthComponent', () => {
  let component: ConfigHealthComponent;
  let fixture: ComponentFixture<ConfigHealthComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfigHealthComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(ConfigHealthComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
