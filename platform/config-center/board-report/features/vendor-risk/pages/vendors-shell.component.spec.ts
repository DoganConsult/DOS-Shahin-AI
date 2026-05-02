import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { VendorsShellComponent } from './vendors-shell.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('VendorsShellComponent', () => {
  let component: VendorsShellComponent;
  let fixture: ComponentFixture<VendorsShellComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VendorsShellComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(VendorsShellComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
