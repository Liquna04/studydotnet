import {BaseFilter} from '../base.model';

export class UserFilter extends BaseFilter {
  GroupId : string = '';
  IsDescending: boolean = true;
  // SortColumn: string = 'name';
  PartnerId! : number ;
  UserType : string = '';
  positionCode : string = '';
  IsActive! : boolean;
}


export interface AdUser {
    userName: string;
    fullName: string;
    groupId: string;
    isActive: boolean;
    UserGroup: AdUserGroup;
  }
  export interface AdUserCreate {
    userName: string;
    fullName: string;
    companyCode: string;
    position: string;
    department: string;
    email: string;
    phoneNumber: string;
    isActive: boolean;
  }

  export interface AdUserGroup {
    id: string;
    name: string;
    isActive: boolean;
    notes: string;
    listUser: AdUser[];
  }
  export interface AdUserUpdateInfor {
    userName: string;
    fullName: string;
    phoneNumber: string;
    email: string;
    address: string;
  }
  export interface AdChangePassword {
    userName: string;
    oldPassword: string;
    newPassword: string;
  }

  export interface AdUserModel {
    userName?: string;
    fullName?: string;
    groupId?: string;
    isActive?: boolean | string;
  }
