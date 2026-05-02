import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ConfigCompareComponent } from './config-compare.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('ConfigCompareComponent', () => {
  let component: ConfigCompareComponent;
  let fixture: ComponentFixture<ConfigCompareComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfigCompareComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(ConfigCompareComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
