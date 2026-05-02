import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { DoraIctAssetsComponent } from './dora-ict-assets.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('DoraIctAssetsComponent', () => {
  let component: DoraIctAssetsComponent;
  let fixture: ComponentFixture<DoraIctAssetsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DoraIctAssetsComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(DoraIctAssetsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
