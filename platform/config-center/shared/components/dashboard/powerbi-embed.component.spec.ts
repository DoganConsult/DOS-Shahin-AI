import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PowerbiEmbedComponent } from './powerbi-embed.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('PowerbiEmbedComponent', () => {
  let component: PowerbiEmbedComponent;
  let fixture: ComponentFixture<PowerbiEmbedComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PowerbiEmbedComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(PowerbiEmbedComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
