import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReturnReportComponent } from './return-report.component';

describe('ReportComponent', () => {
  let component: ReturnReportComponent;
  let fixture: ComponentFixture<ReturnReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReturnReportComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ReturnReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // it('should have sample orders', () => {
  //   expect(component.report.length).toBeGreaterThan(0);
  // });
});
