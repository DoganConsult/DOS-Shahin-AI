import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PageShellComponent } from './page-shell.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('PageShellComponent', () => {
  let component: PageShellComponent;
  let fixture: ComponentFixture<PageShellComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PageShellComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(PageShellComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
