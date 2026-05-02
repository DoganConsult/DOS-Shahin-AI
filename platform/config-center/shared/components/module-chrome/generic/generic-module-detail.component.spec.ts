import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { GenericModuleDetailComponent } from './generic-module-detail.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('GenericModuleDetailComponent', () => {
  let component: GenericModuleDetailComponent;
  let fixture: ComponentFixture<GenericModuleDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GenericModuleDetailComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(GenericModuleDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
