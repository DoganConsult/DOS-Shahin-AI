import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PainModuleMappingComponent } from './pain-module-mapping.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('PainModuleMappingComponent', () => {
  let component: PainModuleMappingComponent;
  let fixture: ComponentFixture<PainModuleMappingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PainModuleMappingComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(PainModuleMappingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
