import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment'; // ✅ Import environment config
import { MaintenanceRequestService } from '../../services/maintenance-request.service';

@Component({
  selector: 'app-etter-registration',
  templateUrl: './etter-registration.component.html',
  styleUrls: ['./etter-registration.component.css']
})
export class EtterRegistrationComponent {
  etter = {
    from: '',
    recommendBy: '',
    status: 'initial'
  };

  successMessage = '';
  isSubmitting = false;

  constructor(
    private http: HttpClient,
    private maintenanceRequestService: MaintenanceRequestService
  ) {}

  onSubmit(form: any) {
    this.isSubmitting = true;
    this.successMessage = '';
    const apiUrl = `${environment.apiBaseUrl}/api/LetterRegistration`; // ✅ Use environment variable

    this.http.post(apiUrl, this.etter).subscribe({
      next: () => {
        this.successMessage = 'Letter registered successfully! / ደብዳቤው በትክክል ተመዝግቧል!';
        
        // Properly reset the form state and values
        form.resetForm({
          from: '',
          recommendBy: '',
          status: 'initial'
        });
        
        this.maintenanceRequestService.triggerNotificationsRefresh();
        this.isSubmitting = false;
        
        // Auto-clear success message after 5 seconds
        setTimeout(() => this.successMessage = '', 5000);
      },
      error: (err) => {
        console.error('Error submitting letter', err);
        this.isSubmitting = false;
      }
    });
  }
}
