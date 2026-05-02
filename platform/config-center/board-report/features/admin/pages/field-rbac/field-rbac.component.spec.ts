import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { FieldRbacComponent } from './field-rbac.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('FieldRbacComponent', () => {
  let component: FieldRbacComponent;
  let fixture: ComponentFixture<FieldRbacComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FieldRbacComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(FieldRbacComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
