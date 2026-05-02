import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AgrcEnginePageComponent } from './agrc-engine-page.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AgrcEnginePageComponent', () => {
  let component: AgrcEnginePageComponent;
  let fixture: ComponentFixture<AgrcEnginePageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AgrcEnginePageComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AgrcEnginePageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
