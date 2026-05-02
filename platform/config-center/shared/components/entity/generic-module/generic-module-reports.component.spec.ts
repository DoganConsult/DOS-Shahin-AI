import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { GenericModuleReportsComponent } from './generic-module-reports.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('GenericModuleReportsComponent', () => {
  let component: GenericModuleReportsComponent;
  let fixture: ComponentFixture<GenericModuleReportsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GenericModuleReportsComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(GenericModuleReportsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
