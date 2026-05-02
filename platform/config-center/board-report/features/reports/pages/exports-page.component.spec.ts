import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ExportsPageComponent } from './exports-page.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('ExportsPageComponent', () => {
  let component: ExportsPageComponent;
  let fixture: ComponentFixture<ExportsPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExportsPageComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(ExportsPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
