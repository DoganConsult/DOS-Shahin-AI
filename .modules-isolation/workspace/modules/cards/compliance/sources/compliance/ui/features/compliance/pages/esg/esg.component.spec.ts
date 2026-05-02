import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { EsgComponent } from './esg.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('EsgComponent', () => {
  let component: EsgComponent;
  let fixture: ComponentFixture<EsgComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EsgComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(EsgComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
