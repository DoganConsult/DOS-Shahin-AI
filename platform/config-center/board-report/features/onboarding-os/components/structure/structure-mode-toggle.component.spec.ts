import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { StructureModeToggleComponent } from './structure-mode-toggle.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('StructureModeToggleComponent', () => {
  let component: StructureModeToggleComponent;
  let fixture: ComponentFixture<StructureModeToggleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StructureModeToggleComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(StructureModeToggleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
