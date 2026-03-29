import { BaseFilter } from '../base.model';

export class AccountGroupFilter extends BaseFilter {
  id?: string;
  name?: string;
  notes?: string;
  state?: boolean;
  isActive?: boolean | string;
  createBy?: string;
  updateBy?: string;
  createDate?: string;
  updateDate?: string;
  listAccount?: ListAccount[];
  listAccountGroupRight?: listAccountGroupRight[];
  account_AccountGroups?: account_AccountGroups[];
  treeRight?: rightOfGroup[];
  IsDescending: boolean = true;
}
export interface ListAccount {
  userName: string;
  fullName: string;
  groupId: string;
  state: boolean;
  isActive?: boolean;
  accountGroup?: string;
  direction?: string;
  headerId?: string;
  Id?: string;
}
export interface ItemData{
  name: string;
  id: string;
  email: string;

}

export interface account_AccountGroups {
  userName?: string;
}

export interface listAccountGroupRight {
  userName?: string;
  fullName?: string;
  groupId?: string;
  state?: boolean;
  isActive?: boolean;
  accountGroup?: string;
  rightId?: string;
}

export class rightOfGroup {
  id: number = 0;
  name: string = '';
  pId: string = '';
  isChecked: boolean = true;
  orderNumber?: string;
  children: rightOfGroup[] = [];
}
export interface listTranfer {
  userName: string;
  fullName: string;
  phoneNumber: string;
  email: string;
  address: string;
  accountType: string;
  organizeCode: string | null;
  urlImage: string;
  faceId: string;
  accountGroups: [];
  accountRights: any[];
  isActive: boolean;
  direction: string;
  checked: boolean;
  hide: boolean;
}
