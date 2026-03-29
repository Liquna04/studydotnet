import { Routes } from '@angular/router';
import { OrderListComponent } from './order-list/order-list.component';
import { OrderCreateComponent } from './order-create/order-create.component';
import { OrderEditComponent } from './order-edit/order-edit.component';
import { OrderDetailComponent } from './order-detail/order-detail.component';
import { ReturnListComponent } from './return-list/return-list.component';
import { ReturnCreateComponent } from './return-create/return-create.component';
import { ReturnEditComponent } from './return-edit/return-edit.component';
import { ReturnDetailComponent } from './return-detail/return-detail.component';
export const orderRoutes: Routes = [
  { path: 'list', component: OrderListComponent },
  { path: 'create', component: OrderCreateComponent },
  { path: 'edit/:id', component: OrderEditComponent },
  { path: 'view/:id', component: OrderDetailComponent },
  { path: 'return-list', component: ReturnListComponent },
  { path: 'return-create', component: ReturnCreateComponent },
  {path: 'return-edit/:code', component: ReturnEditComponent },
  {path: 'return-view/:code', component: ReturnDetailComponent },
  { path: '', redirectTo: 'list', pathMatch: 'full' },
];
