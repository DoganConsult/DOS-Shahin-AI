import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { DoraBackupsComponent } from './dora-backups.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('DoraBackupsComponent', () => {
  let component: DoraBackupsComponent;
  let fixture: ComponentFixture<DoraBackupsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DoraBackupsComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(DoraBackupsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
