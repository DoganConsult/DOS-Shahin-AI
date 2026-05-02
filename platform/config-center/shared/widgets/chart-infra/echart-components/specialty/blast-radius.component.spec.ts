import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { BlastRadiusComponent } from './blast-radius.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('BlastRadiusComponent', () => {
  let component: BlastRadiusComponent;
  let fixture: ComponentFixture<BlastRadiusComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BlastRadiusComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(BlastRadiusComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
