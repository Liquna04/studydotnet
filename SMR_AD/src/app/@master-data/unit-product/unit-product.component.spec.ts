import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UnitProductComponent } from './unit-product.component';

describe('ProductListComponet', () => {
  let component: UnitProductComponent;
  let fixture: ComponentFixture<UnitProductComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UnitProductComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(UnitProductComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
