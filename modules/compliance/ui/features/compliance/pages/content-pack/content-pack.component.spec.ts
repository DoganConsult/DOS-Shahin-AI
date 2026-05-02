import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ContentPackComponent } from './content-pack.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('ContentPackComponent', () => {
  let component: ContentPackComponent;
  let fixture: ComponentFixture<ContentPackComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContentPackComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(ContentPackComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
