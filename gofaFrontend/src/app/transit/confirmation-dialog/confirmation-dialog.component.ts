
import { Component, Inject } from '@angular/core';

@Component({
  selector: 'app-confirmation-dialog',
  template: `
    <div class="modal-header">
      <h5 class="modal-title">{{ data.title }}</h5>
      <button type="button" class="btn-close" (click)="closeDialog()" aria-label="Close"></button>
    </div>
    <div class="modal-body">
      <p>{{ data.message }}</p>
    </div>
    <div class="modal-footer">
      <button type="button" class="btn btn-secondary" (click)="closeDialog()">Cancel</button>
      <button type="button" class="btn btn-danger" (click)="confirmDialog()">Confirm</button>
    </div>
  `
})
export class ConfirmationDialogComponent {
  constructor(@Inject('DIALOG_DATA') public data: any) {}

  closeDialog() {
    // Handle closing the dialog
  }

  confirmDialog() {
    // Handle confirming the action
  }
}
