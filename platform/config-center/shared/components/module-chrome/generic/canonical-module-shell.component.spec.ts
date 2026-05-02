import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { CanonicalModuleShellComponent } from './canonical-module-shell.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('CanonicalModuleShellComponent', () => {
  let component: CanonicalModuleShellComponent;
  let fixture: ComponentFixture<CanonicalModuleShellComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CanonicalModuleShellComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(CanonicalModuleShellComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
