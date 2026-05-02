import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { GrcPageToolbarComponent } from './grc-page-toolbar.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('GrcPageToolbarComponent', () => {
  let component: GrcPageToolbarComponent;
  let fixture: ComponentFixture<GrcPageToolbarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GrcPageToolbarComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(GrcPageToolbarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
