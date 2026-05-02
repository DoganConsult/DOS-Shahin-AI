import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ModuleMastheadComponent } from './module-masthead.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('ModuleMastheadComponent', () => {
  let component: ModuleMastheadComponent;
  let fixture: ComponentFixture<ModuleMastheadComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModuleMastheadComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(ModuleMastheadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
