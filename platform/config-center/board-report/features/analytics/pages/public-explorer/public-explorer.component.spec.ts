import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PublicExplorerComponent } from './public-explorer.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('PublicExplorerComponent', () => {
  let component: PublicExplorerComponent;
  let fixture: ComponentFixture<PublicExplorerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PublicExplorerComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(PublicExplorerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
