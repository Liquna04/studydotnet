import { Routes } from '@angular/router';

import { AccountTypeComponent } from './account-type/account-type.component';
import { TransportTypeComponent } from './transport-type/transport-type.component';
import { TransportUnitComponent } from './transport-unit/transport-unit.component';
import { TransportVehicleComponent } from './transport-vehicle/transport-vehicle.component';
import { ProductListComponent } from './product-list/product-list.component';
import { StorageComponent } from './storage/storage.component';
import { UnitProductComponent } from './unit-product/unit-product.component';
import { CustomerComponent } from './customer/customer.component';
import { StoreComponent } from './store/store.component';
import { UnloadPointComponent } from './unload-point/unload-point.component';
import { ProductTypeComponent } from './product-type/product-type.component';
export const masterDataRoutes: Routes = [
  { path: 'account-type', component: AccountTypeComponent },
  { path: 'transport-type', component: TransportTypeComponent },
  { path: 'transport-unit', component: TransportUnitComponent },
  { path: 'transport-vehicle', component: TransportVehicleComponent },
  { path: 'product-list', component: ProductListComponent },
  { path: 'storage', component: StorageComponent },
  { path: 'unit-product', component: UnitProductComponent },
  { path: 'customer', component: CustomerComponent },
  { path: 'store', component: StoreComponent },
  { path: 'unload-point', component: UnloadPointComponent },
  {path: 'product-type', component: ProductTypeComponent},
];
