import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MentionInputComponent } from './mention-input.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('MentionInputComponent', () => {
  let component: MentionInputComponent;
  let fixture: ComponentFixture<MentionInputComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MentionInputComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(MentionInputComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
