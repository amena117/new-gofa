import { Component, OnInit } from '@angular/core';
import { AdminService } from '../../services/admin.service';
import { UserRolesViewModel } from '../../model/user-roles-view-model';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css'],
  
})
export class AdminDashboardComponent implements OnInit {
  users: UserRolesViewModel[] = [];
  selectedUser: UserRolesViewModel | null = null;
  availableRoles: string[] = ['Admin', 'Manager', 'VHF', 'HF', 'Transit', 'Sparepart', 'Electronics'];
  selectedRoles: string[] = [];

  constructor(private adminService: AdminService) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.adminService.getAllUsers().subscribe(
      (data) => (this.users = data),
      (error) => console.error('Error loading users:', error)
    );
  }

  removeUser(userId: string): void {
    this.adminService.removeUser(userId).subscribe(
      () => {
        this.loadUsers(); // Reload users after deletion
      },
      (error) => console.error('Error removing user:', error)
    );
  }

  openRoleModal(user: UserRolesViewModel): void {
    this.selectedUser = user;
    this.selectedRoles = [...user.Roles];
  }

  closeRoleModal(): void {
    this.selectedUser = null;
    this.selectedRoles = [];
  }

  saveRoles(): void {
    if (!this.selectedUser) return;

    this.adminService.updateUserRoles(this.selectedUser.Id, this.selectedRoles).subscribe(
      () => {
        this.closeRoleModal();
        this.loadUsers(); // Reload users after role update
      },
      (error) => console.error('Error updating roles:', error)
    );
  }
}