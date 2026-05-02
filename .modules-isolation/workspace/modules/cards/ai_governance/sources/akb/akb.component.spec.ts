import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AkbComponent } from './akb.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AkbComponent', () => {
  let component: AkbComponent;
  let fixture: ComponentFixture<AkbComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AkbComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AkbComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
