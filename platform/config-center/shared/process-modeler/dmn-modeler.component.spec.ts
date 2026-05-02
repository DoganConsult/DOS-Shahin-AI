import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { DmnModelerComponent } from './dmn-modeler.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('DmnModelerComponent', () => {
  let component: DmnModelerComponent;
  let fixture: ComponentFixture<DmnModelerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DmnModelerComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(DmnModelerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
