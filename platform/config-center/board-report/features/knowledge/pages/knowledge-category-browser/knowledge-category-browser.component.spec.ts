import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { KnowledgeCategoryBrowserComponent } from './knowledge-category-browser.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('KnowledgeCategoryBrowserComponent', () => {
  let component: KnowledgeCategoryBrowserComponent;
  let fixture: ComponentFixture<KnowledgeCategoryBrowserComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KnowledgeCategoryBrowserComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(KnowledgeCategoryBrowserComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
