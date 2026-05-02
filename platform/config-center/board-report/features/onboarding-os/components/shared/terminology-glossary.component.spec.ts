import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TerminologyGlossaryComponent } from './terminology-glossary.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('TerminologyGlossaryComponent', () => {
  let component: TerminologyGlossaryComponent;
  let fixture: ComponentFixture<TerminologyGlossaryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TerminologyGlossaryComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(TerminologyGlossaryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
