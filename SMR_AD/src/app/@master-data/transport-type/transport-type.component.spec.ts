import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TransportTypeComponent } from './transport-type.component';

describe('TransportTypeComponent', () => {
  let component: TransportTypeComponent;
  let fixture: ComponentFixture<TransportTypeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TransportTypeComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TransportTypeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
