import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { WorkpaperGeneratorComponent } from './workpaper-generator.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('WorkpaperGeneratorComponent', () => {
  let component: WorkpaperGeneratorComponent;
  let fixture: ComponentFixture<WorkpaperGeneratorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkpaperGeneratorComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(WorkpaperGeneratorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
